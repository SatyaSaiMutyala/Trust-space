/*
 * Take-over & handover (prototype viewInspections). “All inspection records” is a server-side list: search (inspector,
 * owner rep, kind, status), kind, status, property, inspection-date range and pagination via GET /api/inspections.
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, prop, useStore, inScope, isOwner, scopeProps } from '../../store/store'
import { leaseState } from '../../domain/lease'
import { fmtD } from '../../domain/utils'
import { PageHead, Panel, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import InspectionTable from './InspectionTable'
import InspectionActions from './InspectionActions'
import { inspActions } from './inspButtons'

const STATUS = ['In progress', 'Awaiting owner sign-off', 'Disputed', 'Signed']

export default function InspectionsPage() {
  useStore()
  const L = useServerList('inspections', 'inspections', { defaults: { limit: 10 } })
  const leases = S.leases.filter(l => inScope(l) && leaseState(l) !== 'Terminated')
  const o = isOwner()
  return (
    <>
      <PageHead title={o ? 'Inspections' : 'Take-over & handover'} sub="Joint inspections done with the owner when TrustLab takes possession and when it hands the premises back. Every item is rated and photographed, and both sides sign before the record locks." />
      <SampleBanner />
      <Panel title="By lease" body={false}>
        <TableCard panel={false}>
          <TableHead><TableRow><TableCell>Property</TableCell><TableCell>Lease</TableCell><TableCell>Status</TableCell><TableCell>Inspections</TableCell></TableRow></TableHead>
          <TableBody>
            {leases.map(L => (
              <TableRow key={L.id}>
                <TableCell>{prop(L.propertyId)?.name || ''}<div className="code">{prop(L.propertyId)?.code || ''}</div></TableCell>
                <TableCell className="small" sx={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{L.ref}<br />{fmtD(L.start)}</TableCell>
                <TableCell><StatusChip label={leaseState(L)} /></TableCell>
                <TableCell><div className="actions">{inspActions(L).length ? <InspectionActions L={L} /> : <span className="small muted">None yet</span>}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableCard>
      </Panel>
      <h2>All inspection records</h2>
      <ListToolbar list={L} searchPlaceholder="Search inspector, owner rep, kind or status" dateLabel="Inspected">
        <ListFilter list={L} name="kind" label="Kind" allLabel="All kinds" width={150} options={[['Move-in', 'Take-over'], ['Move-out', 'Handover']]} />
        <ListFilter list={L} name="status" label="Status" allLabel="All statuses" width={200} options={STATUS} />
        <ListFilter list={L} name="propertyId" label="Property" allLabel="All properties" width={220} options={scopeProps().map(p => [p.id, p.name])} />
      </ListToolbar>
      <InspectionTable server={L} pid={null} />
      <Pager list={L} />
    </>
  )
}
