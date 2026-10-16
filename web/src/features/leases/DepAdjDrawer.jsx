/* Adjust security deposit against rent (prototype DRAWERS.depAdj + SUBMIT.depAdj). d = { lease, preset: [{ period, ownerId }] | null } */
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, prop, owner, closeDrawer } from '../../store/store'
import { CUR, TODAY, inr, num, perLabel } from '../../domain/utils'
import { isMulti, leaseOwners, depHeld, depAdjs, depAdjCandidates, invState } from '../../domain/lease'
import { Btn } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FormGrid, TextInput, SelectInput } from '../../components/form/Fields'
import { submitDepAdj } from './actions'

const SX = { '& .MuiTableCell-root': { fontSize: 12.5 }, '& .MuiTableCell-head': { fontSize: 11 } }
const RADIO_SX = { m: 0, gap: 0.5, '& .MuiRadio-root': { p: 0.25 }, '& .MuiFormControlLabel-label': { fontSize: 13.5 }, '@media (pointer:coarse)': { minHeight: 44 } }

export default function DepAdjDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.lease)
  const [cands] = useState(() => (L ? depAdjCandidates(L) : []))
  const formRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [how, setHow] = useState(L && L.ownerPortal !== false ? 'portal' : '')
  const [live, setLive] = useState({ on: [], tot: 0, held: {} })

  const upd = () => {
    const f = formRef.current; if (!f || !L) return
    const held = {}; leaseOwners(L).forEach(o => held[o.ownerId] = depHeld(L, o.ownerId) - depAdjs(L, o.ownerId, true).filter(a => a.status === 'Proposed').reduce((s2, a) => s2 + (+a.amount || 0), 0))
    let tot = 0; const on = cands.map((c, i) => { const x = f.elements['on_' + i]?.checked; const amt = num(f.elements['amt_' + i]?.value); if (x) { held[c.ownerId] -= amt; tot += amt } return !!x })
    setLive({ on, tot, held })
  }
  useEffect(upd, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!L) return <DrawerLayout title="" />
  const multi = isMulti(L); const pre = new Set((d.preset || []).map(x => x.period + '|' + x.ownerId))
  const lastN = new Set(cands.map(c => c.period).sort().slice(-Math.min(3, cands.length)))
  const isPre = c => pre.size ? pre.has(c.period + '|' + c.ownerId) : (L.exit?.noticeDate ? lastN.has(c.period) : false)

  const onChange = e => { if (e.target.name === 'how') setHow(e.target.value); upd() }
  const onSubmit = async e => {
    e.preventDefault(); setBusy(true)
    try { await submitDepAdj(new FormData(e.currentTarget), L.id) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title="Adjust security deposit against rent" sub={`${prop(L.propertyId)?.name || ''} · ${L.ref} · deposit held ${inr(depHeld(L))} of ${inr(L.deposit)}`}
      footer={cands.length ? <><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-da" disabled={busy}>Adjust against deposit</Btn></> : null}>
      {cands.length ? (
        <form id="f-da" ref={formRef} onSubmit={onSubmit} onInput={upd} onChange={onChange} style={{ display: 'grid', gap: 14 }}>
          <p className="small muted" style={{ margin: 0 }}>Tick the months to be settled from the security deposit instead of a bank payment. The amount defaults to the net rent payable after TDS — TrustLab still deducts and deposits TDS on the full rent. {multi ? 'Each co-owner’s month is settled from their own share of the deposit.' : ''}</p>
          <div className="tbl-wrap">
            <Table size="small" className="otable" sx={SX}>
              <TableHead><TableRow>
                <TableCell /><TableCell>Rent month</TableCell>{multi ? <TableCell>Owner</TableCell> : null}<TableCell className="num">Rent (gross)</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">From deposit</TableCell><TableCell>Invoice</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {cands.map((c, i) => {
                  const inv = c.inv ? S.invoices.find(x => x.id === c.inv) : null
                  return (
                    <TableRow key={c.period + '|' + c.ownerId} className={`da-row${live.on.length && !live.on[i] ? ' off' : ''}`}>
                      <TableCell padding="checkbox"><Checkbox name={`on_${i}`} id={`da-on${i}`} defaultChecked={isPre(c)} size="small" slotProps={{ input: { 'aria-label': `Adjust ${perLabel(c.period)}` } }} /></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}><label htmlFor={`da-on${i}`}><b>{perLabel(c.period)}</b></label>{c.period === CUR ? <> <span className="small muted">this month</span></> : c.period < CUR ? <> <span className="small" style={{ color: 'var(--bad)' }}>overdue</span></> : null}</TableCell>
                      {multi ? <TableCell className="small">{owner(c.ownerId)?.name || ''}</TableCell> : null}
                      <TableCell className="num">{inr(c.gross)}</TableCell>
                      <TableCell className="num">{c.tds ? inr(c.tds) : '—'}</TableCell>
                      <TableCell className="num">
                        <TextInput grid={false} type="number" name={`amt_${i}`} defaultValue={c.amount} min="0" htmlInput={{ 'aria-label': 'Amount from deposit' }} sx={{ width: 120, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '6px' } }} />
                        <input type="hidden" name={`key_${i}`} value={`${c.period}|${c.ownerId}|${c.tds}`} />
                      </TableCell>
                      <TableCell className="small">{inv ? <StatusChip label={invState(inv)} /> : <span className="muted">Not yet</span>}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="small" id="da-sum">
            Total from deposit <b>{inr(live.tot)}</b> · {leaseOwners(L).map((o, i) => <span key={o.ownerId}>{i ? ' · ' : ''}{multi ? (owner(o.ownerId)?.name || '') + ': ' : ''}held after <b style={{ color: live.held[o.ownerId] < 0 ? 'var(--bad)' : 'inherit' }}>{inr(live.held[o.ownerId])}</b></span>)}
          </div>
          <fieldset className="dafs"><legend className="eyebrow">Owner’s agreement</legend>
            <RadioGroup name="how" defaultValue={L.ownerPortal !== false ? 'portal' : ''}>
              <FormControlLabel value="portal" control={<Radio size="small" />} label={`Ask ${multi ? 'each owner' : 'the owner'} to agree in TruSpace`} sx={RADIO_SX} />
              <FormControlLabel value="recorded" control={<Radio size="small" />} label={`${multi ? 'Owners have' : 'Owner has'} already agreed — record it`} sx={RADIO_SX} />
            </RadioGroup>
            <Box className="da-rec" hidden={how !== 'recorded'} sx={{ pt: 1 }}>
              <FormGrid>
                <SelectInput id="da-how2" name="how2" label="Agreed by" options={['Letter', 'Email', 'WhatsApp', 'Signed addendum', 'Meeting minutes']} defaultValue="Letter" />
                <TextInput id="da-ond" name="on" label="Agreed on" type="date" defaultValue={TODAY} />
                <TextInput id="da-ref" name="ref" label="Reference" full placeholder="e.g. letter dated 12 Oct 2026" />
              </FormGrid>
            </Box>
          </fieldset>
          <TextInput grid={false} id="da-note" name="note" label="Reason / note" placeholder="e.g. Final 3 months of notice period settled from deposit" defaultValue={L.exit?.noticeDate ? 'Notice period — rent settled from security deposit' : ''} />
        </form>
      ) : <div className="empty">No unpaid rent months left to adjust.</div>}
    </DrawerLayout>
  )
}
