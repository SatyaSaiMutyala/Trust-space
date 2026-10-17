/* TDS deductions and challans for one month (prototype DRAWERS.tdsMonth). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import DrawerLayout from '../../components/app/DrawerLayout'
import { owner, prop, isOwner, useStore } from '../../store/store'
import { inr, fmtD, perLabel, fy } from '../../domain/utils'
import { TST } from '../../domain/tds'
import { useTdsReport } from './useTdsReport'
import { Btn, Empty, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { tdsChallan } from './actions'

export default function TdsMonthDrawer({ d }) {
  useStore()
  const { report, isLoading } = useTdsReport(d.m ? fy(d.m + '-01') : null)
  const r = report?.rows.find(x => x.m === d.m)
  if (!r) return <DrawerLayout title="TDS"><Empty>{isLoading ? 'Loading…' : 'Not found.'}</Empty></DrawerLayout>
  return (
    <DrawerLayout title={`TDS · ${perLabel(d.m)}`} sub={<>Deducted {inr(r.ded)} · deposited {inr(r.dep)} · due {fmtD(r.due)} · <StatusChip label={r.st} k={TST[r.st]} /></>}
      footer={r.bal > 0 && !isOwner() ? <Btn primary onClick={() => tdsChallan(d.m)}>Record challan for {inr(r.bal)}</Btn> : null}>
      <TableCard>
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Owner / PAN</TableCell><TableCell>Premises</TableCell><TableCell>Source</TableCell><TableCell className="num">Amount credited</TableCell><TableCell className="num">Rate</TableCell><TableCell className="num">TDS</TableCell></TableRow></TableHead>
        <TableBody>
          {r.es.map((x, i) => (
            <TableRow key={i}>
              <TableCell className="small" sx={{ whiteSpace: 'nowrap' }}>{fmtD(x.date)}</TableCell>
              <TableCell>{owner(x.ownerId)?.name || ''}<div className="code">{owner(x.ownerId)?.pan || 'No PAN'}</div></TableCell>
              <TableCell className="small">{prop(x.propertyId)?.code || ''}</TableCell>
              <TableCell className="small">{x.src}</TableCell>
              <TableCell className="num">{inr(x.base)}</TableCell>
              <TableCell className="num">{x.rate}%</TableCell>
              <TableCell className="num"><b>{inr(x.tds)}</b></TableCell>
            </TableRow>
          ))}
          {r.es.length ? null : <TableRow><TableCell colSpan={7} className="empty">No deductions this month.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
      {r.cs.length ? (
        <TableCard>
          <TableHead><TableRow><TableCell>Challan</TableCell><TableCell>Paid on</TableCell><TableCell className="num">Amount</TableCell></TableRow></TableHead>
          <TableBody>
            {r.cs.map(c => <TableRow key={c.id}><TableCell className="mono">{c.bsr} / {c.challanNo}</TableCell><TableCell>{fmtD(c.paidOn)}</TableCell><TableCell className="num">{inr(c.amount)}</TableCell></TableRow>)}
          </TableBody>
        </TableCard>
      ) : null}
    </DrawerLayout>
  )
}
