/* Deactivate, add or reactivate a co-owner on a lease, and set the new split of rent and maintenance among the owners
   who remain active. The change applies from this month (or next month, when this month is already invoiced); every
   earlier month keeps the split that was in force then (lease.ownerHistory). Deposit and advance rent stay with the
   owners who received them at signing. */
import { useMemo, useState } from 'react'
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
import { CUR, perAdd, perLabel, pctLabel } from '../../domain/utils'
import { leaseOwners, allLeaseOwners, isCoShareOwner } from '../../domain/lease'
import { Btn, Banner, Empty } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { TextInput, SelectInput } from '../../components/form/Fields'
import { submitOwnerChange } from './actions'

const G = [['', 'As per the lease'], ['Forward', 'Registered — GST on invoice'], ['RCM', 'Unregistered — tenant pays RCM'], ['None', 'No GST']]
const SX = { '& .MuiTableCell-root': { fontSize: 12.5, verticalAlign: 'middle' }, '& .MuiTableCell-head': { fontSize: 11 } }
const NUM_SX = { width: 96, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }
const pct = v => Math.round((+v || 0) * 100) / 100
/** Even split in whole %, remainder to the first owner. */
const even = n => { const b = Math.floor(100 / n); return Array.from({ length: n }, (_, i) => b + (i === 0 ? 100 - b * n : 0)) }

const TITLE = { deactivate: 'Deactivate owner', add: 'Add an owner', reactivate: 'Reactivate owner' }

export default function OwnerChangeDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.lease)
  const mode = d.mode
  const [busy, setBusy] = useState(false)
  const [same, setSame] = useState(true)
  const [when, setWhen] = useState('this')
  const [note, setNote] = useState('')
  const [newId, setNewId] = useState(mode === 'reactivate' ? d.ownerId : '')
  const current = useMemo(() => (L ? leaseOwners(L) : []), [L])
  // the owners who will be active after the change
  const active = useMemo(() => {
    if (!L) return []
    if (mode === 'deactivate') return current.filter(o => o.ownerId !== d.ownerId)
    if (!newId) return current
    const prev = allLeaseOwners(L).find(x => x.ownerId === newId)
    return current.concat([{ ownerId: newId, rent: 0, maint: 0, dep: 0, adv: 0, gst: prev ? prev.share.gst || '' : '' }])
  }, [L, mode, current, d.ownerId, newId])
  const [rows, setRows] = useState(null) // { ownerId: { rent, maint } }
  const init = useMemo(() => { const e = even(Math.max(1, active.length)); const o = {}; active.forEach((x, i) => { o[x.ownerId] = { rent: e[i], maint: e[i], gst: x.gst || '' } }); return o }, [active])
  const vals = rows && active.every(x => rows[x.ownerId]) ? rows : init
  const set = (id, k, v) => setRows(r => { const base = { ...(r && active.every(x => r[x.ownerId]) ? r : init) }; base[id] = { ...base[id], [k]: v }; if (same && k === 'rent') base[id].maint = v; return base })
  if (!L) return <DrawerLayout title={TITLE[mode]}><Empty>Lease not found.</Empty></DrawerLayout>
  const P = prop(L.propertyId); const who = owner(d.ownerId)
  const sumOf = k => active.reduce((a, x) => a + (+vals[x.ownerId]?.[k] || 0), 0)
  const off = k => Math.abs(sumOf(k) - 100) > 0.01
  const monthLabel = when === 'next' ? perLabel(perAdd(CUR, 1)) : perLabel(CUR)
  // this month already invoiced by the leaving owner (or by anyone, for an add) → the change can only start next month
  const invoicedThisMonth = S.invoices.some(i => i.leaseId === L.id && i.type === 'Rent' && i.period === CUR && i.status !== 'Rejected' && (mode !== 'deactivate' || (i.ownerId || L.ownerId) === d.ownerId))
  const candidates = S.owners.filter(o => !current.some(x => x.ownerId === o.id))
  const former = allLeaseOwners(L).filter(x => !x.active)
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try {
      const owners = active.map(x => (isCoShareOwner(owner(x.ownerId)) ? { ownerId: x.ownerId, rent: pct(vals[x.ownerId].rent), maint: pct(vals[x.ownerId].maint), dep: 0, adv: 0, gst: 'None', role: 'coShare' } : { ownerId: x.ownerId, rent: pct(vals[x.ownerId].rent), maint: pct(vals[x.ownerId].maint), dep: pct(vals[x.ownerId].rent), adv: pct(vals[x.ownerId].rent), gst: vals[x.ownerId].gst || '' }))
      await submitOwnerChange(L.id, { mode, ownerId: mode === 'deactivate' ? d.ownerId : newId, owners, from: when === 'next' || invoicedThisMonth ? perAdd(CUR, 1) : CUR, note: note.trim() })
    } finally { setBusy(false) }
  }
  const canSubmit = active.length >= 1 && (mode === 'deactivate' ? current.length > 1 : !!newId) && !off('rent') && !off('maint')
  return (
    <DrawerLayout title={TITLE[mode]} sub={`${P?.name || ''} · ${L.ref}${mode === 'deactivate' && who ? ` · ${who.name}` : ''}`}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-oc" disabled={busy || !canSubmit}>{mode === 'deactivate' ? 'Deactivate & save split' : mode === 'add' ? 'Add owner & save split' : 'Reactivate & save split'}</Btn></>}>
      <form id="f-oc" onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        {mode === 'deactivate' && current.length <= 1 ? <Banner tone="bad">This is the only active owner. Add the new owner first, then deactivate this one.</Banner> : null}
        {mode === 'deactivate' ? <p className="small muted" style={{ margin: 0 }}><b>{who?.name}</b> stops receiving rent from {monthLabel}. Their earlier invoices, ledger and TDS stay as they are; they keep read access to their records.</p> : null}
        {mode === 'add' ? <SelectInput id="oc-new" name="newOwner" label="Owner to add" value={newId} onChange={e => setNewId(e.target.value)} options={[['', '— choose —'], ...candidates.map(o => [o.id, o.name + (o.pan ? ' · ' + o.pan : '') + (isCoShareOwner(o) ? ' · co-share' : '')])]} hint="Add the person in Owners first if they are not listed. A co-share is paid a share of the rent but is not on the agreement" full /> : null}
        {mode === 'reactivate' ? <SelectInput id="oc-re" name="reOwner" label="Owner to reactivate" value={newId} onChange={e => setNewId(e.target.value)} options={former.map(x => [x.ownerId, `${owner(x.ownerId)?.name || x.ownerId} · left after ${perLabel(x.until)}`])} full /> : null}
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Payment split from {monthLabel}</div>
          <div className="tbl-wrap">
            <Table size="small" className="otable oedit" sx={SX}>
              <TableHead><TableRow><TableCell>Owner</TableCell><TableCell className="num">Rent %</TableCell><TableCell className="num">Maint. %</TableCell><TableCell>GST status</TableCell><TableCell>Was</TableCell></TableRow></TableHead>
              <TableBody>
                {active.map(x => { const O = owner(x.ownerId); const was = current.find(c => c.ownerId === x.ownerId); return (
                  <TableRow key={x.ownerId}>
                    <TableCell><b>{O?.name || x.ownerId}</b>{isCoShareOwner(O) ? <> <StatusChip label="Co-share" k="info" /></> : null}{!was ? <> <StatusChip label="New" k="info" /></> : null}<div className="code">{O?.pan || ''}</div></TableCell>
                    <TableCell className="num"><TextInput grid={false} type="number" min="0" max="100" step="0.01" value={vals[x.ownerId]?.rent ?? ''} onChange={e => set(x.ownerId, 'rent', e.target.value)} sx={NUM_SX} htmlInput={{ 'aria-label': 'Rent %' }} /></TableCell>
                    <TableCell className="num"><TextInput grid={false} type="number" min="0" max="100" step="0.01" value={vals[x.ownerId]?.maint ?? ''} onChange={e => set(x.ownerId, 'maint', e.target.value)} disabled={same} sx={NUM_SX} htmlInput={{ 'aria-label': 'Maintenance %' }} /></TableCell>
                    <TableCell>{isCoShareOwner(O) ? <span className="small muted">No GST (co-share)</span> : <SelectInput grid={false} value={vals[x.ownerId]?.gst ?? ''} onChange={e => set(x.ownerId, 'gst', e.target.value)} options={G} sx={{ minWidth: 190, '& select': { py: '7px' } }} aria-label="GST status" />}</TableCell>
                    <TableCell className="small muted">{was ? `${pctLabel(was.rent)} rent` : '—'}</TableCell>
                  </TableRow>) })}
                {mode === 'deactivate' && who ? <TableRow><TableCell className="muted"><s>{who.name}</s> <StatusChip label="Deactivated" k="idle" /></TableCell><TableCell className="num muted">0%</TableCell><TableCell className="num muted">0%</TableCell><TableCell /><TableCell className="small muted">{pctLabel(current.find(c => c.ownerId === d.ownerId)?.rent)} rent</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <div className="filters" style={{ marginTop: 6, justifyContent: 'space-between' }}>
            <FormControlLabel control={<Checkbox size="small" checked={same} onChange={e => setSame(e.target.checked)} />} label={<span className="small">Same split for maintenance</span>} />
            <span className="small" style={{ color: off('rent') || off('maint') ? 'var(--bad)' : 'var(--muted)' }}>Rent {Math.round(sumOf('rent') * 100) / 100}% · Maintenance {Math.round(sumOf('maint') * 100) / 100}%{off('rent') || off('maint') ? ' — each must total 100%' : ''}</span>
          </div>
          <p className="hint" style={{ margin: '4px 0 0' }}>Security deposit and advance rent stay with the owners who received them at signing; they are settled with those owners at exit.</p>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Applies from</div>
          {invoicedThisMonth ? <Banner>{perLabel(CUR)} is already invoiced{mode === 'deactivate' ? ` by ${who?.name}` : ''}, so the change starts from {perLabel(perAdd(CUR, 1))}.</Banner>
            : <RadioGroup row value={when} onChange={e => setWhen(e.target.value)}>
                <FormControlLabel value="this" control={<Radio size="small" />} label={<span className="small">This month ({perLabel(CUR)})</span>} />
                <FormControlLabel value="next" control={<Radio size="small" />} label={<span className="small">Next month ({perLabel(perAdd(CUR, 1))})</span>} />
              </RadioGroup>}
        </div>
        <TextInput id="oc-note" label="Reason / note" value={note} onChange={e => setNote(e.target.value)} placeholder={mode === 'deactivate' ? 'e.g. Sold their share to … on 12 Oct 2026 · sale deed no. …' : mode === 'add' ? 'e.g. Bought a 40% share from …' : 'e.g. Share restored after the sale fell through'} full />
        <Box className="small muted">Shown in the lease’s owner changes. The owner’s invoice prefix, PAN and bank details are taken from their owner record.</Box>
      </form>
    </DrawerLayout>
  )
}
