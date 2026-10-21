/* Owners & share of payments table for a co-owned lease (prototype ownersBlock). Props: { L }. */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, isOwner, role, owner } from '../../store/store'
import { ownerChangeOpen } from '../../store/actions'
import { Btn } from '../../components/ui/Layout'
import { CUR, inr, pctLabel, perLabel } from '../../domain/utils'
import { rentFor, maskAcct, tdsPerOwner, tdsRate, panValid, certFor, leaseState } from '../../domain/lease'
import { TableSkeleton } from '../../components/ui/Skeletons'
import { useLeaseSchedule } from './useLeaseSchedule'
import { useLeaseDeposit } from './useLeaseDeposit'
import { StatusChip } from '../../components/ui/Status'
import { BankChip } from '../owners/OwnerProfile'

const G = { Forward: 'GST on invoice', RCM: 'RCM (TrustLab pays)', None: 'No GST' }
const SX = { '& .MuiTableCell-root': { fontSize: 12.5 }, '& .MuiTableCell-head': { fontSize: 11 } }

export default function OwnersBlock({ L, heading = true }) {
  useStore()
  const { sc } = useLeaseSchedule(L.id); const { dep } = useLeaseDeposit(L.id); const me = isOwner() ? role().ownerId : null
  if (!sc) return <TableSkeleton rows={2} cols={9} panel={false} />
  const canChange = !isOwner() && !['Terminated'].includes(leaseState(L)) && L.status !== 'Draft'
  const activeCount = (sc.owners || []).filter(x => x.active !== false).length
  return (
    <div>
      {heading ? <div className="eyebrow" style={{ marginBottom: 6 }}>Owners &amp; share of payments</div> : null}
      <div className="tbl-wrap">
        <Table size="small" className="otable" sx={SX}>
          <TableHead><TableRow>
            <TableCell>Owner</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">Maint.</TableCell><TableCell className="num">Deposit</TableCell><TableCell className="num">Advance</TableCell><TableCell>GST</TableCell><TableCell>TDS</TableCell><TableCell className="num">Rent now</TableCell><TableCell>Bank</TableCell><TableCell>Status</TableCell>{canChange ? <TableCell /> : null}
          </TableRow></TableHead>
          <TableBody>
            {(sc.owners || []).map(x => {
              const O = owner(x.ownerId); const sh = x.share; const off = x.active === false
              return (
                <TableRow key={x.ownerId} className={me === x.ownerId ? 'youRow' : undefined} sx={off ? { '& td': { color: 'var(--muted)' } } : undefined}>
                  <TableCell><b>{O?.name || '—'}</b>{x.role === 'coShare' ? <> <StatusChip label="Co-share" k="info" /></> : null}{me === x.ownerId ? <> <StatusChip label="You" k="info" /></> : null}<div className="code">{O?.pan || ''}</div></TableCell>
                  <TableCell className="num">{inr(Math.round((+L.rent || 0) * sh.rent / 100))}<div className="small muted">{pctLabel(sh.rent)}</div></TableCell>
                  <TableCell className="num">{inr(Math.round((+L.maint || 0) * sh.maint / 100))}<div className="small muted">{pctLabel(sh.maint)}</div></TableCell>
                  <TableCell className="num">{inr(x.deposit)}<div className="small muted">{pctLabel(sh.dep)}{(() => { const o = dep?.owners.find(w => w.ownerId === x.ownerId); return o && o.adjusted ? ` · held ${inr(o.held)}` : '' })()}</div></TableCell>
                  <TableCell className="num">{x.adv ? inr(x.adv) : '—'}<div className="small muted">{pctLabel(sh.adv)}</div></TableCell>
                  <TableCell className="small">{x.role === 'coShare' ? 'No GST (co-share)' : G[x.mode] || x.mode}</TableCell>
                  <TableCell className="small">{x.tdsOn ? (!panValid(O) ? <span style={{ color: 'var(--bad)' }}>{tdsRate(x.ownerId, CUR + '-01')}% — no valid PAN</span> : certFor(O, CUR + '-01') ? `${tdsRate(x.ownerId, CUR + '-01')}% (certificate)` : `${tdsRate(x.ownerId, CUR + '-01')}%`) : 'Below threshold'}</TableCell>
                  <TableCell className="num">{off ? '—' : inr(Math.round(rentFor(L, CUR) * sh.rent / 100))}</TableCell>
                  <TableCell className="small" sx={{ whiteSpace: 'nowrap' }}>{O ? <>{O.bankName || ''} {maskAcct(O.acctNo)} <BankChip O={O} /></> : ''}</TableCell>
                  <TableCell className="small" sx={{ whiteSpace: 'nowrap' }}>{off ? <><StatusChip label="Deactivated" k="idle" /><div className="muted">until {perLabel(x.until)}</div></> : <><StatusChip label="Active" k="ok" />{x.since && x.since !== L.start.slice(0, 7) ? <div className="muted">from {perLabel(x.since)}</div> : null}</>}</TableCell>
                  {canChange ? <TableCell>{off ? <Btn sm onClick={() => ownerChangeOpen(L.id, 'reactivate', x.ownerId)}>Reactivate</Btn> : activeCount > 1 ? <Btn sm ghost onClick={() => ownerChangeOpen(L.id, 'deactivate', x.ownerId)}>Deactivate</Btn> : null}</TableCell> : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {canChange ? <div className="filters" style={{ marginTop: 8 }}><Btn sm onClick={() => ownerChangeOpen(L.id, 'add')}>+ Add owner</Btn><span className="small muted">An owner who leaves is deactivated from this month and keeps their earlier invoices and ledger; adding or reactivating one asks for the new split.</span></div> : null}
      {(L.ownerChanges || []).length ? <div style={{ marginTop: 10 }}><div className="eyebrow" style={{ marginBottom: 4 }}>Owner changes</div><div className="list">{L.ownerChanges.slice().reverse().map((c, i) => <div key={i} className="li"><span className="when">{perLabel(c.from)}</span><div className="grow"><div>{c.text}</div><div className="small muted">Split: {c.split}{c.note ? ` · ${c.note}` : ''} · {c.by}</div></div></div>)}</div></div> : null}
      <p className="small muted" style={{ margin: '6px 0 0' }}>Each owner raises a separate invoice for their share and is paid to their own account.{(sc.owners || []).some(x => x.role === 'coShare') ? ' A co-share is paid their share with TDS on their PAN but is not on the agreement: a rent payment voucher is generated for them each month instead of an invoice, with no GST.' : ''} {tdsPerOwner(L) ? 'TDS is tested on each co-owner’s share of rent (co-owners with defined shares are separate payees) — confirm with your tax adviser.' : 'TDS is tested on the total rent.'}</p>
    </div>
  )
}
