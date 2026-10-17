/* Opening balance for one lease, month by month (prototype DRAWERS.opening + obRowHTML + ACT.obAdd/obDel/obFill + SUBMIT.opening). */
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableFooter from '@mui/material/TableFooter'
import TableCell from '../invoices/TableCell'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, prop, owner, toast, closeDrawer, useStore } from '../../store/store'
import { inr, fmtD, perAdd, num, newId } from '../../domain/utils'
import { OB_DATE, isMulti, leaseOwners, ownersLabel } from '../../domain/lease'
import { INV_TYPES } from '../../domain/constants'
import { Btn, Empty, TableCard } from '../../components/ui/Layout'
import { TextInput, CheckField } from '../../components/form/Fields'
import { submitOpening, obFillItems } from './actions'

const cellSx = { verticalAlign: 'middle' }

/** Native select carrying the prototype's row class (ob-own / ob-type) on the <select> itself, so rows can be read like the prototype. */
function RowSelect({ cls, label, options, defaultValue, sx }) {
  return (
    <TextField select defaultValue={defaultValue} sx={sx} slotProps={{ select: { native: true }, htmlInput: { className: cls, 'aria-label': label } }}>
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
    </TextField>
  )
}

/** One editable month row (prototype obRowHTML). Inputs are uncontrolled; values are read from the DOM on submit. */
function ObRow({ L, it, multi, onDel }) {
  return (
    <TableRow className="obrow" data-id={it.id || ''} data-paid={JSON.stringify({ paidAmount: it.paidAmount, tds: it.tds, paidOn: it.paidOn, utr: it.utr })}>
      <TableCell sx={cellSx}><TextInput grid={false} type="month" defaultValue={it.period || ''} max={perAdd(OB_DATE.slice(0, 7), -1)} required htmlInput={{ className: 'ob-per', 'aria-label': 'Month and year' }} sx={{ width: 150 }} /></TableCell>
      {multi ? <TableCell sx={cellSx}><RowSelect cls="ob-own" label="Owner" defaultValue={it.ownerId} options={leaseOwners(L).map(o => [o.ownerId, owner(o.ownerId)?.name || '—'])} sx={{ minWidth: 200 }} /></TableCell> : null}
      <TableCell sx={cellSx}><RowSelect cls="ob-type" label="For" defaultValue={it.type || 'Rent'} options={INV_TYPES} sx={{ minWidth: 150 }} /></TableCell>
      <TableCell sx={cellSx}><TextInput grid={false} type="number" min={0} defaultValue={it.amount ?? ''} required htmlInput={{ className: 'ob-amt', 'aria-label': 'Amount due' }} sx={{ width: 130 }} /></TableCell>
      <TableCell sx={cellSx}><TextInput grid={false} defaultValue={it.note || ''} placeholder="Invoice no., part-paid…" htmlInput={{ className: 'ob-note', 'aria-label': 'Remarks' }} sx={{ width: 200 }} /></TableCell>
      <TableCell sx={cellSx}>{+it.paidAmount ? <span className="small muted">paid</span> : <Btn sm ghost aria-label="Remove" onClick={onDel}>✕</Btn>}</TableCell>
    </TableRow>
  )
}

export default function OpeningDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.id)
  const ob = L ? (L.opening || { asOf: OB_DATE, items: [] }) : null
  const [rows, setRows] = useState(() => (ob ? ob.items : []).map(it => ({ key: newId(), it })))
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  const sum = () => { const f = formRef.current; if (!f) return; setTotal([...f.querySelectorAll('.ob-amt')].reduce((a, x) => a + num(x.value), 0)) }
  useEffect(sum, [rows])
  if (!L) return <DrawerLayout title="Opening balance"><Empty>Removed.</Empty></DrawerLayout>
  const multi = isMulti(L)
  const asOfP = ob.asOf.slice(0, 7)
  const fromDef = perAdd(asOfP, -3) < L.start.slice(0, 7) ? L.start.slice(0, 7) : perAdd(asOfP, -3)

  const obAdd = () => setRows(r => [...r, { key: newId(), it: { period: perAdd(OB_DATE.slice(0, 7), -1), type: 'Rent', ownerId: leaseOwners(L)[0].ownerId } }])
  const obDel = key => setRows(r => r.filter(x => x.key !== key))
  const obFill = async () => {
    const f = formRef.current
    const have = new Set([...f.querySelectorAll('.obrow')].map(tr => tr.querySelector('.ob-per').value + '|' + (tr.querySelector('.ob-own')?.value || L.ownerId) + '|' + tr.querySelector('.ob-type').value))
    let add; try { add = await obFillItems(L, f.querySelector('#ob-from').value, have) } catch (e) { toast(e.message, 'error'); return }
    const n = add.length
    if (n) setRows(r => [...r, ...add.map(it => ({ key: newId(), it }))])
    toast(n ? `${n} month${n > 1 ? 's' : ''} added from the rent schedule — remove any that were already paid.` : 'Nothing to add for that period.')
  }
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitOpening(L.id, e.currentTarget, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={`Opening balance · ${prop(L.propertyId)?.name || ''}`} sub={`${L.ref} · ${ownersLabel(L)} · dues outstanding as on ${fmtD(ob.asOf)}`}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-ob" disabled={busy}>Save opening balance</Btn></>}>
      <Box component="form" id="f-ob" ref={formRef} onSubmit={onSubmit} onInput={sum} onChange={sum} sx={{ display: 'grid', gap: '14px', minWidth: 0 }}>
        <p className="small muted" style={{ margin: 0 }}>Enter each month and year for which {multi ? 'an owner was' : 'the owner was'} still owed money on {fmtD(ob.asOf)}, with the amount due (as per the owner’s invoice, including GST if charged). Leave the list empty if nothing was due.</p>
        <TableCard className="otable oedit" cards={false}>
          <TableHead><TableRow><TableCell>Month / year</TableCell>{multi ? <TableCell>Owner</TableCell> : null}<TableCell>For</TableCell><TableCell>Amount due (₹)</TableCell><TableCell>Remarks</TableCell><TableCell /></TableRow></TableHead>
          <TableBody id="ob-rows">
            {rows.map(r => <ObRow key={r.key} L={L} it={r.it} multi={multi} onDel={() => obDel(r.key)} />)}
          </TableBody>
          <TableFooter sx={{ '& td': { color: 'var(--ink)', fontSize: 13.5 } }}>
            <TableRow>
              <TableCell colSpan={multi ? 3 : 2}>
                <div className="filters">
                  <Btn sm onClick={obAdd}>＋ Add month</Btn>
                  <Btn sm onClick={obFill}>Fill from rent schedule</Btn>
                  <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>from <TextInput grid={false} id="ob-from" type="month" defaultValue={fromDef} max={perAdd(asOfP, -1)} sx={{ width: 190 }} /></label>
                </div>
              </TableCell>
              <TableCell className="num"><b id="ob-total">{inr(total)}</b></TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </TableCard>
        <CheckField grid={false} id="ob-conf" name="confirmed" defaultChecked={!!ob.confirmed} label={`Opening balance agreed with ${multi ? 'each owner' : 'the owner'} (statement reconciled)`} />
        <TextInput grid={false} id="ob-src" name="source" label="Source / reference" defaultValue={ob.source || ''} placeholder="e.g. Tally ledger as on 31 Mar 2026; owner statement dated 05 Apr 2026" />
      </Box>
    </DrawerLayout>
  )
}
