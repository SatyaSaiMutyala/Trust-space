/*
 * Inspection table (prototype inspTable). pid hides the Property column. Two modes: `list` = a local array (property,
 * lease and owner pages), or `server` = a useServerList() result (rows as the API sorted and paged them; the empty
 * state shows the API's message).
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, prop, useStore } from '../../store/store'
import { inspSummary } from '../../domain/inspection'
import { IN_KIND, inspStatusK } from '../../domain/constants'
import { by, fmtD, inr } from '../../domain/utils'
import { openInsp } from '../../store/actions'
import { TableCard, ClickRow, Empty } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'

export default function InspectionTable({ list, pid, server }) {
  useStore()
  const rows = server ? server.rows : [...list].sort(by('date', -1))
  if (!rows.length && server?.isFetching) return <TableSkeleton rows={6} cols={pid ? 6 : 7} />
  if (!rows.length) return <Empty panel>{server ? server.message || 'No inspections found.' : 'No inspections recorded.'}</Empty>
  return (
    <Refreshing on={!!server?.isFetching}><TableCard>
      <TableHead><TableRow>
        <TableCell>Inspection</TableCell>{pid ? null : <TableCell>Property</TableCell>}<TableCell>Date</TableCell><TableCell>Issues</TableCell><TableCell className="num">Deductions</TableCell><TableCell>Signed</TableCell><TableCell>Status</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map(I => {
          const { flagged, ded } = inspSummary(I)
          return (
            <ClickRow key={I.id} onClick={() => openInsp(I.id)}>
              <TableCell><b>{IN_KIND[I.kind]}</b><div className="code">{S.leases.find(l => l.id === I.leaseId)?.ref || ''}</div></TableCell>
              {pid ? null : <TableCell>{prop(I.propertyId)?.name || ''}</TableCell>}
              <TableCell>{fmtD(I.date)}</TableCell>
              <TableCell>{flagged.length}</TableCell>
              <TableCell className="num">{I.kind === 'Move-out' ? inr(ded) : '—'}</TableCell>
              <TableCell className="small" sx={{ fontSize: 12.5 }}>{I.tdplSign ? 'TrustLab ✓' : 'TrustLab —'}<br />{I.ownerSign ? 'Owner ✓' : 'Owner —'}</TableCell>
              <TableCell><StatusChip label={I.status} k={inspStatusK(I.status)} /></TableCell>
            </ClickRow>
          )
        })}
      </TableBody>
    </TableCard></Refreshing>
  )
}
