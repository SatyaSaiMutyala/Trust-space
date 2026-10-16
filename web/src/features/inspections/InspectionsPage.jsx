/*
 * Take-over & handover (prototype viewInspections). “All inspection records” is a server-side list: search (inspector,
 * owner rep, kind, status), kind, status, property, inspection-date range and pagination via GET /api/inspections.
 */
import { useState } from 'react'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, prop, useStore, inScope, isOwner, scopeProps } from '../../store/store'
import { leaseState } from '../../domain/lease'
import { inspHidden } from '../../domain/inspection'
import { fmtD } from '../../domain/utils'
import { PageHead, Panel, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import InspectionTable from './InspectionTable'
import { InspKindCell } from './LeaseInspections'

const STATUS = ['Not started', 'In progress', 'Awaiting owner sign-off', 'Disputed', 'Signed']

/** Local paging for the By-lease table (same Pager control as the server lists). */
function useLocalPager(total) {
  const [p, setP] = useState({ page: 1, limit: 10 })
  const totalPages = Math.max(1, Math.ceil(total / p.limit)); const page = Math.min(p.page, totalPages)
  return { pagination: { page, limit: p.limit, total, totalPages }, set: patch => setP(x => ({ ...x, ...patch, page: patch.limit ? 1 : (patch.page ?? x.page) })), slice: rows => rows.slice((page - 1) * p.limit, page * p.limit) }
}

export default function InspectionsPage() {
  useStore()
  const L = useServerList('inspections', 'inspections', { defaults: { limit: 10 } })
  // Records hidden behind a skip are dropped from the page, so the count and pager say what is actually shown.
  const hidden = L.rows.filter(inspHidden).length
  const shown = Math.max(0, (L.pagination?.total || 0) - hidden)
  const LV = hidden ? { ...L, pagination: L.pagination ? { ...L.pagination, total: shown, totalPages: Math.max(1, Math.ceil(shown / L.pagination.limit)) } : L.pagination, message: shown ? `${shown} inspection${shown === 1 ? '' : 's'} found.` : 'No inspections found for these filters.' } : L
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const leases = S.leases.filter(l => inScope(l) && leaseState(l) !== 'Terminated').filter(l => !needle || `${prop(l.propertyId)?.name || ''} ${prop(l.propertyId)?.code || ''} ${l.ref}`.toLowerCase().includes(needle))
    .sort((a, b) => (prop(a.propertyId)?.name || '').localeCompare(prop(b.propertyId)?.name || ''))
  const pager = useLocalPager(leases.length)
  const o = isOwner()
  return (
    <>
      <PageHead title={o ? 'Inspections' : 'Take-over & handover'} sub="Joint inspections done with the owner when TrustLab takes possession and when it hands the premises back. Every item is rated and photographed, and both sides sign before the record locks." />
      <SampleBanner />
      <Panel title="By lease" sub={`${leases.length} lease${leases.length === 1 ? '' : 's'}`} body={false}
        actions={<TextField size="small" value={q} onChange={e => { setQ(e.target.value); pager.set({ page: 1 }) }} placeholder="Filter by property or lease" sx={{ width: 260, maxWidth: '100%', '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)' } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Filter leases' } }} />}>
        <TableCard panel={false}>
          <TableHead><TableRow><TableCell>Property</TableCell><TableCell>Lease</TableCell><TableCell>Lease status</TableCell><TableCell>Take-over inspection</TableCell><TableCell>Handover inspection</TableCell></TableRow></TableHead>
          <TableBody>
            {pager.slice(leases).map(L => (
              <TableRow key={L.id}>
                <TableCell>{prop(L.propertyId)?.name || ''}<div className="code">{prop(L.propertyId)?.code || ''}</div></TableCell>
                <TableCell className="small" sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{L.ref}<br />{fmtD(L.start)}</TableCell>
                <TableCell><StatusChip label={leaseState(L)} /></TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}><InspKindCell L={L} kind="Move-in" /></TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}><InspKindCell L={L} kind="Move-out" /></TableCell>
              </TableRow>
            ))}
            {!leases.length ? <TableRow><TableCell colSpan={5}><span className="muted">No leases match.</span></TableCell></TableRow> : null}
          </TableBody>
        </TableCard>
        <div style={{ padding: '4px 16px' }}><Pager list={pager} /></div>
      </Panel>
      <h2>All inspection records</h2>
      <ListToolbar list={LV} searchPlaceholder="Search inspector, owner rep, kind or status" dateLabel="Inspected">
        <ListFilter list={L} name="kind" label="Kind" allLabel="All kinds" width={150} options={[['Move-in', 'Take-over'], ['Move-out', 'Handover']]} />
        <ListFilter list={L} name="status" label="Status" allLabel="All statuses" width={200} options={STATUS} />
        <ListFilter list={L} name="propertyId" label="Property" allLabel="All properties" width={220} options={scopeProps().map(p => [p.id, p.name])} />
      </ListToolbar>
      <InspectionTable server={LV} pid={null} />
      <Pager list={LV} />
    </>
  )
}
