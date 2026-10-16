/*
 * Invoice register (prototype invoiceTable). compact hides the Property column.
 * Two modes: `invoices` = a local array, or `list` = a useServerList() result (rows as the API sorted and paged
 * them; the empty state shows the API's message).
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from './TableCell'
import { prop, useStore } from '../../store/store'
import { openInv } from '../../store/actions'
import { inr, fmtD, perLabel } from '../../domain/utils'
import { invState } from '../../domain/lease'
import { Empty, TableCard, ClickRow } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'

export default function InvoiceTable({ invoices, list, compact }) {
  useStore()
  const rows = list ? list.rows : invoices
  if (!rows.length && list?.isFetching) return <TableSkeleton rows={6} cols={compact ? 9 : 10} />
  if (!rows.length) return <Empty panel>{list ? list.message || 'No invoices found.' : 'No invoices yet.'}</Empty>
  return (
    <Refreshing on={!!list?.isFetching}><TableCard>
      <TableHead><TableRow>
        <TableCell>Invoice</TableCell>{compact ? null : <TableCell>Property</TableCell>}<TableCell>Type</TableCell><TableCell>Period</TableCell>
        <TableCell className="num">Amount</TableCell><TableCell className="num">GST</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Net payable</TableCell><TableCell>Status</TableCell><TableCell>Paid</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {rows.map(i => (
          <ClickRow key={i.id} onClick={() => openInv(i.id)}>
            <TableCell sx={{ whiteSpace: 'nowrap' }}><span className="mono">{i.number}</span><div className="small muted">{fmtD(i.date)} · {i.source === 'Uploaded' ? 'Uploaded' : 'Generated'}</div></TableCell>
            {compact ? null : <TableCell sx={{ minWidth: 140 }}>{prop(i.propertyId)?.name || ''}<div className="code">{prop(i.propertyId)?.code || ''}</div></TableCell>}
            <TableCell>{i.type}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>{perLabel(i.period)}</TableCell>
            <TableCell className="num">{inr(i.base)}</TableCell>
            <TableCell className="num">{i.gst ? inr(i.gst) : i.rcm ? <span className="small muted">RCM</span> : '—'}</TableCell>
            <TableCell className="num">{i.tds ? inr(i.tds) : '—'}</TableCell>
            <TableCell className="num"><b>{inr(i.net)}</b></TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}><StatusChip label={invState(i)} /></TableCell>
            <TableCell className="small">{i.paidDate ? <>{fmtD(i.paidDate)}<div className="code">{i.paidBy === 'Deposit' ? 'From deposit' : i.utr || ''}</div></> : ''}</TableCell>
          </ClickRow>
        ))}
      </TableBody>
    </TableCard></Refreshing>
  )
}
