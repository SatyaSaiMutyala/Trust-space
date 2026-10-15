/* One lease's exit: steps, facts, findings, deductions and the form for the current stage (prototype exitPanel + SUBMIT.exit). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, isOwner, useStore } from '../../store/store'
import { openInsp, newInsp, startExit } from '../../store/actions'
import { lockEnd } from '../../domain/lease'
import { inspOf } from '../../domain/inspection'
import { TODAY, daysTo, fmtD, inr } from '../../domain/utils'
import { Btn, Panel, Banner, Facts, TableCard } from '../../components/ui/Layout'
import { Steps } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, Cell, TextInput, CheckField } from '../../components/form/Fields'
import { EXIT_STEPS, submitExit, cancelExit } from './actions'

const bannerSx = { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }

export default function ExitPanel({ L }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const x = L.exit || {}; const stage = x.stage || 0; const o = isOwner()
  if (!x.noticeDate) {
    const le = lockEnd(L)
    return (
      <Panel>
        <p className="muted">No exit started for this lease. Earliest exit without penalty: {fmtD(le && le > TODAY ? le : TODAY)} (lock-in) with {L.notice} months’ notice.</p>
        {o ? null : <Btn primary onClick={() => startExit(L.id)}>Serve notice</Btn>}
      </Panel>
    )
  }
  const dedTotal = (x.deductions || []).reduce((s, d) => s + (+d.amount || 0), 0)
  const pendInv = S.invoices.filter(i => i.leaseId === L.id && !['Paid', 'Rejected'].includes(i.status))
  const refund = (+L.deposit || 0) - dedTotal

  const submit = step => async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitExit(L.id, step, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  const submitBtn = label => <Cell full><Btn primary type="submit" disabled={busy}>{label}</Btn></Cell>

  let form = null
  if (!o && stage < 5) {
    if (stage === 1) {
      const mo = inspOf(L.id, 'Move-out')
      form = (
        <Banner sx={bannerSx}>
          <span><b>Next: joint handover inspection with the owner.</b> Every item is checked against the take-over record and photographed; agreed damages flow into the deposit settlement.</span>
          {mo ? <Btn primary onClick={() => openInsp(mo.id)}>Continue inspection · {mo.status}</Btn> : <Btn primary onClick={() => newInsp(L.id, 'Move-out')}>Start handover inspection</Btn>}
        </Banner>
      )
    }
    if (stage === 2) form = (
      <form onSubmit={submit(3)} key="s2"><FormGrid>
        <TextInput id="ex-hd" name="handoverDate" label="Handover date" type="date" defaultValue={x.handoverDate || x.effective} required />
        <TextInput id="ex-mr" name="meterFinal" label="Final meter reading (kWh)" type="number" defaultValue={x.meterFinal || ''} required />
        <CheckField id="ex-keys" name="keys" label="All keys, access cards and remotes returned to owner" required />
        <CheckField id="ex-rest" name="restored" label="Premises restored per lease (signage, partitions, cabling removed)" />
        {submitBtn('Confirm handover')}
      </FormGrid></form>
    )
    if (stage === 3) form = (
      <form onSubmit={submit(4)} key="s3"><FormGrid>
        <TextInput id="ex-ded" name="deductions" label="Deductions from deposit — one per line as “description, amount”" full multiline
          placeholder={'Wall repainting, 18000\nFinal electricity bill, 6420'} defaultValue={(x.deductions || []).map(d => d.desc + ', ' + d.amount).join('\n')}
          hint={`Pending owner invoices on this lease: ${pendInv.length} (${inr(pendInv.reduce((s, i) => s + i.net, 0))}). Settle them before closing.`} />
        {submitBtn('Agree final settlement')}
      </FormGrid></form>
    )
    if (stage === 4) form = (
      <form onSubmit={submit(5)} key="s4"><FormGrid>
        <TextInput id="ex-rd" name="refundDate" label="Refund received on" type="date" defaultValue={TODAY} required />
        <TextInput id="ex-utr" name="utr" label="UTR / reference" required />
        <TextInput id="ex-ra" name="refund" label="Amount received" type="number" defaultValue={refund} required />
        {submitBtn('Close exit & terminate lease')}
      </FormGrid></form>
    )
  }

  return (
    <Panel>
      <Box sx={{ display: 'grid', gap: '18px', gridTemplateColumns: 'minmax(0,1fr)' }}>
        <Steps steps={EXIT_STEPS} stage={stage} />
        <Facts items={[
          ['Notice served', `${fmtD(x.noticeDate)} by ${x.noticeBy}`],
          ['Effective date', fmtD(x.effective) + (x.effective >= TODAY ? ` · in ${daysTo(x.effective)} days` : '')],
          ['Reason', x.reason || '—'],
          ['Security deposit', inr(L.deposit)],
          ['Deductions', inr(dedTotal)],
          ['Refund due', <b key="r">{inr(refund)}</b>],
          x.inspectionDate ? ['Inspection', fmtD(x.inspectionDate)] : null,
          x.handoverDate ? ['Handover', fmtD(x.handoverDate) + ` · meter ${x.meterFinal} kWh`] : null,
          x.refundDate ? ['Refund received', `${fmtD(x.refundDate)} · ${x.utr}`] : null,
        ]} />
        {x.inspectionId ? <div><Btn sm onClick={() => openInsp(x.inspectionId)}>Open signed handover inspection</Btn></div> : null}
        {x.inspectionNotes ? (
          <div>
            <div className="eyebrow">Inspection findings</div>
            <div style={{ whiteSpace: 'pre-wrap', maxWidth: '75ch' }}>{x.inspectionNotes}</div>
            <PhotoStrip files={x.photos} empty="No inspection photos" />
          </div>
        ) : null}
        {(x.deductions || []).length ? (
          <TableCard panel={false}>
            <TableHead><TableRow><TableCell>Deduction</TableCell><TableCell className="num" align="right">Amount</TableCell></TableRow></TableHead>
            <TableBody>{x.deductions.map((d, i) => <TableRow key={i}><TableCell>{d.desc}</TableCell><TableCell className="num" align="right">{inr(d.amount)}</TableCell></TableRow>)}</TableBody>
          </TableCard>
        ) : null}
        {form}
        {!o && stage < 5 && stage >= 1 ? <div><Btn sm danger onClick={() => cancelExit(L.id)}>Withdraw notice</Btn></div> : null}
      </Box>
    </Panel>
  )
}
