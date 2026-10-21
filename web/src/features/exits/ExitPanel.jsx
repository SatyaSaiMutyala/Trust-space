/* One lease's exit: steps, facts, findings, deductions and the form for the current stage (prototype exitPanel + SUBMIT.exit). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, isOwner, owner, useStore, openDrawer } from '../../store/store'
import { openInsp, newInsp, startExit, depAdjOpen } from '../../store/actions'
import { lockEnd, lockEndLessor, lockInLessee, lockInLessor, isMulti, depositOwners, ownerShare, noticeLessee, noticeLessor } from '../../domain/lease'
import { useLeaseDeposit } from '../leases/useLeaseDeposit'
import { useOpening } from '../opening/useOpening'
import { inspOf, inspOpen } from '../../domain/inspection'
import { TODAY, daysTo, fmtD, inr, pctLabel } from '../../domain/utils'
import { Btn, Panel, Banner, Facts, TableCard } from '../../components/ui/Layout'
import { Steps } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, Cell, TextInput, CheckField } from '../../components/form/Fields'
import { EXIT_STEPS, submitExit, cancelExit } from './actions'

const bannerSx = { display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }

export default function ExitPanel({ L }) {
  useStore()
  const { dep } = useLeaseDeposit(L.id)
  const { opening } = useOpening(); const obL = opening?.leases.find(l => l.leaseId === L.id)?.outstanding || 0 // opening arrears on this lease, computed by the API
  const [busy, setBusy] = useState(false)
  const x = L.exit || {}; const stage = x.stage || 0; const o = isOwner()
  if (!x.noticeDate) {
    const le = lockEnd(L)
    return (
      <Panel>
        <p className="muted">No exit started for this lease. Earliest exit without penalty for the tenant: {fmtD(le && le > TODAY ? le : TODAY)} (lock-in {lockInLessee(L)} mo) with {noticeLessee(L)} months’ notice{lockInLessor(L) !== lockInLessee(L) || noticeLessor(L) !== noticeLessee(L) ? `; for the owner: ${fmtD(lockEndLessor(L) && lockEndLessor(L) > TODAY ? lockEndLessor(L) : TODAY)} (lock-in ${lockInLessor(L)} mo) with ${noticeLessor(L)} months’ notice` : ''}.</p>
        {o ? null : <Btn primary onClick={() => startExit(L.id)}>Serve notice</Btn>}
      </Panel>
    )
  }
  const dedTotal = (x.deductions || []).reduce((s, d) => s + (+d.amount || 0), 0)
  const pendInv = S.invoices.filter(i => i.leaseId === L.id && !['Paid', 'Rejected'].includes(i.status))
  const held = dep?.held || 0, adjTot = dep?.adjusted || 0; const refund = held - dedTotal
  const multi = isMulti(L)
  const refundRows = multi ? depositOwners(L).map(w => { const s = dep?.settlement.rows.find(r => r.ownerId === w.ownerId) || { dep: 0, ded: 0, due: 0 }; return { ownerId: w.ownerId, dep: s.dep, ded: s.ded, due: s.due, got: (x.refunds || []).find(r => r.ownerId === w.ownerId) } }) : []

  const submit = step => async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitExit(L.id, step, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  const submitBtn = label => <Cell full><Btn primary type="submit" disabled={busy}>{label}</Btn></Cell>

  let form = null
  const forms = []
  if (!o && stage < 5) {
    if (stage === 1) {
      const mo = inspOf(L.id, 'Move-out')
      form = (
        <Banner sx={bannerSx} key="s1">
          <span><b>Next: joint handover inspection with the owner.</b> Every item is checked against the take-over record and photographed; agreed damages flow into the deposit settlement.</span>
          <span className="actions">{mo ? <Btn primary onClick={() => openInsp(mo.id)}>Continue inspection · {mo.status}</Btn> : <Btn primary onClick={() => newInsp(L.id, 'Move-out')}>Start handover inspection</Btn>}{!mo || inspOpen(mo) ? <Btn onClick={() => openDrawer({ kind: 'skipInsp', id: L.id, insp: 'Move-out' })}>Skip — no handover record</Btn> : null}</span>
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
    if (form) forms.push(form)
    if (stage <= 3 && !o) forms.push(
      <Banner sx={bannerSx} key="dep">
        <span>Use the security deposit for the remaining months’ rent instead of paying cash? Held now: <b>{inr(held)}</b>.</span>
        <Btn sm onClick={() => depAdjOpen(L.id)}>Adjust deposit against rent</Btn>
      </Banner>
    )
    if (stage === 3) forms.push(
      <form onSubmit={submit(4)} key="s3"><FormGrid>
        <TextInput id="ex-ded" name="deductions" label="Deductions from deposit — one per line as “description, amount”" full multiline
          placeholder={'Wall repainting, 18000\nFinal electricity bill, 6420'} defaultValue={(x.deductions || []).map(d => d.desc + ', ' + d.amount).join('\n')}
          hint={`Pending owner invoices on this lease: ${pendInv.length} (${inr(pendInv.reduce((s, i) => s + i.net, 0))})${obL ? ` plus opening arrears ${inr(obL)}` : ''}. Settle them before closing.`} />
        {submitBtn('Agree final settlement')}
      </FormGrid></form>
    )
    if (stage === 4 && multi) forms.push(
      <form onSubmit={submit(5)} key="s4m"><FormGrid>
        <Cell full><div className="eyebrow">Refund received from each owner</div></Cell>
        {refundRows.map((r, i) => (
          <Cell full key={r.ownerId}><div className="ofrow">
            <b>{owner(r.ownerId)?.name || ''}</b><span className="small muted">Deposit held {inr(r.dep)} − share of deductions {inr(r.ded)} = <b>{inr(r.due)}</b></span>
            <FormGrid sx={{ mt: 1 }}>
              <TextInput id={'ex-ra' + i} name={'ramt_' + r.ownerId} label="Amount received" type="number" defaultValue={r.due} required />
              <TextInput id={'ex-rd' + i} name={'rdate_' + r.ownerId} label="Received on" type="date" defaultValue={TODAY} required />
              <TextInput id={'ex-ru' + i} name={'rutr_' + r.ownerId} label="UTR / reference" required />
            </FormGrid>
          </div></Cell>
        ))}
        {submitBtn('Close exit & terminate lease')}
      </FormGrid></form>
    )
    else if (stage === 4) forms.push(
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
          ['Security deposit', <>{inr(L.deposit)}{adjTot ? <div className="small muted">{inr(adjTot)} adjusted against rent · {inr(held)} held</div> : null}</>],
          ['Deductions', inr(dedTotal)],
          ['Refund due', <b key="r">{inr(refund)}</b>],
          x.inspectionDate ? ['Inspection', fmtD(x.inspectionDate)] : null,
          x.handoverDate ? ['Handover', fmtD(x.handoverDate) + ` · meter ${x.meterFinal} kWh`] : null,
          x.refundDate && !multi ? ['Refund received', `${fmtD(x.refundDate)} · ${x.utr}`] : null,
        ]} />
        {multi ? (
          <TableCard panel={false} className="otable">
            <TableHead><TableRow><TableCell>Owner</TableCell><TableCell className="num" align="right">Deposit held</TableCell><TableCell className="num" align="right">Share of deductions</TableCell><TableCell className="num" align="right">Refund due</TableCell><TableCell>Received</TableCell></TableRow></TableHead>
            <TableBody>{refundRows.map(r => (
              <TableRow key={r.ownerId}>
                <TableCell>{owner(r.ownerId)?.name || ''} <span className="small muted">{pctLabel(ownerShare(L, r.ownerId, 'dep', L.start.slice(0, 7)) * 100)}</span></TableCell>
                <TableCell className="num" align="right">{inr(r.dep)}</TableCell>
                <TableCell className="num" align="right">{r.ded ? '−' + inr(r.ded) : '—'}</TableCell>
                <TableCell className="num" align="right"><b>{inr(r.due)}</b></TableCell>
                <TableCell className="small">{r.got ? `${inr(r.got.amount)} · ${fmtD(r.got.date)} · ${r.got.utr}` : <span className="muted">Pending</span>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </TableCard>
        ) : null}
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
        {forms}
        {!o && stage < 5 && stage >= 1 ? <div><Btn sm danger onClick={() => cancelExit(L.id)}>Withdraw notice</Btn></div> : null}
      </Box>
    </Panel>
  )
}
