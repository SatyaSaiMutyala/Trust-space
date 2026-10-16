/* Opening balance month-wise panel (prototype obMonthTable). Props: { leases, types, ownerId, compact } — renders nothing when there are no items. */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableFooter from '@mui/material/TableFooter'
import TableCell from '../invoices/TableCell'
import { prop, owner, isOwner, useStore } from '../../store/store'
import { obPay } from '../../store/actions'
import { inr, fmtD, perLabel } from '../../domain/utils'
import { OB_DATE, obItems, obOut } from '../../domain/lease'
import { Panel, TableCard, ClickRow } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'

export default function ObMonthTable({ leases, types, ownerId, compact }) {
  useStore()
  const rows = (leases || []).flatMap(L => obItems(L, types, ownerId).map(it => ({ L, it }))).sort((a, b) => a.it.period.localeCompare(b.it.period))
  if (!rows.length) return null
  const tot = rows.reduce((a, r) => a + (+r.it.amount || 0), 0), out = rows.reduce((a, r) => a + obOut(r.it), 0)
  const o = isOwner()
  return (
    <Panel body={false} title={<h3>Opening balance as on {fmtD(OB_DATE)} — month-wise</h3>} sub="Dues brought forward from before TruSpace went live."
      actions={out ? <StatusChip label={'Outstanding ' + inr(out)} k="bad" /> : <StatusChip label="All cleared" k="ok" />}>
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Month / year</TableCell><TableCell>Premises</TableCell>{compact ? null : <TableCell>Owner</TableCell>}<TableCell>For</TableCell><TableCell className="num">Amount due</TableCell><TableCell className="num">Paid</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Outstanding</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map(({ L, it }) => {
            const cells = <>
              <TableCell sx={{ whiteSpace: 'nowrap' }}><b>{perLabel(it.period)}</b></TableCell>
              <TableCell className="small">{prop(L.propertyId)?.code || ''}</TableCell>
              {compact ? null : <TableCell className="small">{owner(it.ownerId)?.name || ''}</TableCell>}
              <TableCell className="small">{it.type}{it.note ? <div className="muted">{it.note}</div> : null}</TableCell>
              <TableCell className="num">{inr(it.amount)}</TableCell>
              <TableCell className="num">{+it.paidAmount ? inr(it.paidAmount) : '—'}</TableCell>
              <TableCell className="num">{+it.tds ? inr(it.tds) : '—'}</TableCell>
              <TableCell className="num"><b>{inr(obOut(it))}</b></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{obOut(it) ? <StatusChip label="Due" k="bad" /> : <StatusChip label={'Paid ' + fmtD(it.paidOn)} k="ok" />}</TableCell>
            </>
            return o ? <TableRow key={L.id + it.id}>{cells}</TableRow> : <ClickRow key={L.id + it.id} onClick={() => obPay(L.id, it.id)}>{cells}</ClickRow>
          })}
        </TableBody>
        <TableFooter sx={{ '& td': { color: 'var(--ink)', fontSize: 13.5 } }}>
          <TableRow className="yr"><TableCell><b>Total</b></TableCell><TableCell />{compact ? null : <TableCell />}<TableCell /><TableCell className="num"><b>{inr(tot)}</b></TableCell><TableCell /><TableCell /><TableCell className="num"><b>{inr(out)}</b></TableCell><TableCell /></TableRow>
        </TableFooter>
      </TableCard>
    </Panel>
  )
}
