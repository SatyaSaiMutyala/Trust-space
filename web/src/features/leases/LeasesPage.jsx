/*
 * Leases & contracts — port of viewLeases. Server-side list: search (reference, clauses), agreement status, GST mode,
 * property, start-date range and pagination via GET /api/leases (useServerList).
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, prop, owner, scopeProps } from '../../store/store'
import { newLease, openLease } from '../../store/actions'
import { CUR, fmtD, inr } from '../../domain/utils'
import { leaseState, rentFor } from '../../domain/lease'
import { Btn, PageHead, TableCard, ClickRow, Empty } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'

const TAX = { Forward: 'GST 18%', RCM: 'GST RCM', None: 'No GST' }

/* Tablet widths: keep refs, dates and chips on one line and let the table scroll instead of squeezing them. */
const NW = { whiteSpace: 'nowrap' }

export default function LeasesPage() {
  useStore()
  const L = useServerList('leases', 'leases', { defaults: { limit: 10 } })
  return (
    <>
      <PageHead title="Leases & contracts" sub="Every agreement from term sheet to termination: rent, escalation, lock-in, deposit, tax treatment and signed copies." actions={<Btn primary onClick={() => newLease()}>New lease</Btn>} />
      <ListToolbar list={L} searchPlaceholder="Search lease reference or clauses" dateLabel="Start">
        <ListFilter list={L} name="status" label="Agreement" allLabel="Any status" options={[['Draft', 'Draft / term sheet'], ['Active', 'Signed & active']]} />
        <ListFilter list={L} name="gstMode" label="GST" allLabel="Any GST" options={[['Forward', 'GST 18%'], ['RCM', 'GST RCM'], ['None', 'No GST']]} />
        <ListFilter list={L} name="propertyId" label="Property" allLabel="All properties" width={220} options={scopeProps().map(p => [p.id, p.name])} />
      </ListToolbar>
      {!L.rows.length && L.isFetching ? <TableSkeleton rows={6} cols={9} /> : L.rows.length ? (
        <Refreshing on={L.isFetching}><TableCard>
          <TableHead><TableRow>
            <TableCell>Lease</TableCell><TableCell>Property</TableCell><TableCell>Owner</TableCell><TableCell>Term</TableCell><TableCell className="num">Rent now</TableCell><TableCell>Escalation</TableCell><TableCell className="num">Deposit</TableCell><TableCell>Tax</TableCell><TableCell>Status</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {L.rows.map(l => (
              <ClickRow key={l.id} onClick={() => openLease(l.id)}>
                <TableCell className="mono" sx={NW}>{l.ref}</TableCell>
                <TableCell sx={{ minWidth: 140 }}>{prop(l.propertyId)?.name || ''}</TableCell>
                <TableCell sx={{ minWidth: 130 }}>{owner(l.ownerId)?.name || ''}</TableCell>
                <TableCell className="small" sx={NW}>{fmtD(l.start)} –<br />{fmtD(l.end)}</TableCell>
                <TableCell className="num">{inr(rentFor(l, CUR))}</TableCell>
                <TableCell className="small" sx={NW}>{l.escPct ? `${l.escPct}% / ${l.escEvery} mo` : '—'}</TableCell>
                <TableCell className="num">{inr(l.deposit)}</TableCell>
                <TableCell className="small" sx={NW}>{TAX[l.gstMode]}{l.tds ? ' · TDS 10%' : ''}</TableCell>
                <TableCell sx={NW}><StatusChip label={leaseState(l)} /></TableCell>
              </ClickRow>
            ))}
          </TableBody>
        </TableCard></Refreshing>
      ) : <Empty panel>{L.message || 'No leases found.'}</Empty>}
      <Pager list={L} />
    </>
  )
}
