/* Rent month — rent for one month of a co-owned lease, owner by owner (prototype DRAWERS.rentMonth). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, prop, owner } from '../../store/store'
import { openInv, newInvoice } from '../../store/actions'
import { TODAY, fmtD, inr, perLabel, pctLabel } from '../../domain/utils'
import { schedRow, ownerShare, invState } from '../../domain/lease'
import { Btn, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'

export default function RentMonthDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.lease); const r = L ? schedRow(L, d.period) : null
  if (!L || !r) return <DrawerLayout title="Rent" />
  const rentInv = x => i => i.leaseId === L.id && i.period === d.period && i.type === 'Rent' && i.ownerId === x.ownerId
  const rows = r.split.filter(x => x.rent - x.adj > 0 || S.invoices.some(rentInv(x)))
  return (
    <DrawerLayout title={`Rent ${perLabel(d.period)} · ${prop(L.propertyId)?.name || ''}`} sub={`${rows.length} owners · due ${fmtD(r.due)}${r.notes.length ? ' · ' + r.notes.join(', ') : ''}`}>
      <TableCard>
        <TableHead><TableRow>
          <TableCell>Owner</TableCell><TableCell className="num">Share</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">GST / RCM</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Net payable</TableCell><TableCell>Invoice</TableCell><TableCell />
        </TableRow></TableHead>
        <TableBody>
          {rows.map(x => {
            const iv = S.invoices.find(i => rentInv(x)(i) && i.status !== 'Rejected'); const rr = x.rent - x.adj
            return (
              <TableRow key={x.ownerId}>
                <TableCell><b>{owner(x.ownerId)?.name || '—'}</b></TableCell>
                <TableCell className="num">{pctLabel(ownerShare(L, x.ownerId, 'rent') * 100)}</TableCell>
                <TableCell className="num">{inr(rr)}{x.adj ? <div className="small muted">after advance {inr(x.adj)}</div> : null}</TableCell>
                <TableCell className="num small">{x.mode === 'Forward' ? inr(Math.round(rr * 0.18)) : x.mode === 'RCM' ? 'RCM ' + inr(Math.round(rr * 0.18)) : '—'}</TableCell>
                <TableCell className="num">{x.tdsOn ? '−' + inr(Math.round(rr * x.tdsRate / 100)) : '—'}</TableCell>
                <TableCell className="num"><b>{inr(iv ? iv.net : x.rentNet)}</b></TableCell>
                <TableCell>{iv ? <><StatusChip label={invState(iv)} /><div className="code">{iv.number}</div></> : <StatusChip label={r.due < TODAY ? 'Not invoiced' : 'Upcoming'} k={r.due < TODAY ? 'bad' : 'idle'} />}</TableCell>
                <TableCell>{iv ? <Btn sm onClick={() => openInv(iv.id)}>Open</Btn> : <Btn sm primary onClick={() => newInvoice({ lease: L.id, period: d.period, owner: x.ownerId })}>Record invoice</Btn>}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard>
    </DrawerLayout>
  )
}
