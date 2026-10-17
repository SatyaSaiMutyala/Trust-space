/* Security deposit adjusted against rent — the lease's adjustments with Agree/Decline (owner) or Cancel (TrustLab) (prototype depAdjTable). */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, S, isOwner, role, owner } from '../../store/store'
import { fmtD, inr, perLabel } from '../../domain/utils'
import { isMulti, depAdjs } from '../../domain/lease'
import { useLeaseDeposit } from './useLeaseDeposit'
import { Btn } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { depAgree, depDecline, depCancel } from './actions'

const K = { Agreed: 'ok', Proposed: 'warn', Declined: 'bad', Cancelled: 'idle' }
const SX = { '& .MuiTableCell-root': { fontSize: 12.5 }, '& .MuiTableCell-head': { fontSize: 11 } }

export default function DepAdjTable({ L, heading = true }) {
  useStore()
  const me = isOwner() ? role().ownerId : null; const { dep } = useLeaseDeposit(L.id)
  const mine = me ? dep?.owners.find(o => o.ownerId === me) : null
  const rows = depAdjs(L, me, true).concat((L.depAdj || []).filter(a => ['Declined', 'Cancelled'].includes(a.status) && (!me || a.ownerId === me))).sort((a, b) => a.period.localeCompare(b.period))
  if (!rows.length) return null
  const multi = isMulti(L) && !me
  return (
    <div>
      <div className="filters" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        {heading ? <div className="eyebrow">Security deposit adjusted against rent</div> : <span />}
        <span className="small">{dep ? <>Held now {inr(me ? mine?.held || 0 : dep.held)} of {inr(me ? mine?.share || 0 : dep.deposit)}</> : null}</span>
      </div>
      <div className="tbl-wrap">
        <Table size="small" className="otable" sx={SX}>
          <TableHead><TableRow>
            <TableCell>Rent month</TableCell>{multi ? <TableCell>Owner</TableCell> : null}<TableCell className="num">From deposit</TableCell><TableCell className="num">TDS (by TrustLab)</TableCell><TableCell className="num">Rent settled</TableCell><TableCell>Status</TableCell><TableCell>Agreement</TableCell><TableCell />
          </TableRow></TableHead>
          <TableBody>
            {rows.map(a => (
              <TableRow key={a.id}>
                <TableCell><b>{perLabel(a.period)}</b></TableCell>
                {multi ? <TableCell className="small">{owner(a.ownerId)?.name || ''}</TableCell> : null}
                <TableCell className="num">{inr(a.amount)}</TableCell>
                <TableCell className="num">{+a.tds ? inr(a.tds) : '—'}</TableCell>
                <TableCell className="num">{inr((+a.amount || 0) + (+a.tds || 0))}</TableCell>
                <TableCell><StatusChip label={a.status} k={K[a.status]} /></TableCell>
                <TableCell className="small">{a.status === 'Agreed' ? `${a.consent?.how || ''} ${fmtD(a.consent?.on)}${a.consent?.ref ? ' · ' + a.consent.ref : ''}` : a.status === 'Declined' ? (a.declineReason || '') : (a.note || '')}</TableCell>
                <TableCell>
                  {me && a.status === 'Proposed'
                    ? <div className="actions"><Btn sm primary onClick={() => depAgree(L.id, a.id)}>Agree</Btn><Btn sm danger onClick={() => depDecline(L.id, a.id)}>Decline</Btn></div>
                    : !me && ['Proposed', 'Agreed'].includes(a.status) && !S.invoices.some(i => i.leaseId === L.id && i.period === a.period && i.ownerId === a.ownerId && i.paidBy === 'Deposit')
                      ? <Btn sm ghost onClick={() => depCancel(L.id, a.id)}>Cancel</Btn> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
