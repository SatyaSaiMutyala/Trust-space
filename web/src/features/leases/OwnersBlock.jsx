/* Owners & share of payments table for a co-owned lease (prototype ownersBlock). Props: { L }. */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, isOwner, role, owner } from '../../store/store'
import { CUR, inr, pctLabel } from '../../domain/utils'
import { schedule, rentFor, depAdjusted, depHeld, maskAcct, tdsPerOwner } from '../../domain/lease'
import { StatusChip } from '../../components/ui/Status'
import { BankChip } from '../owners/OwnerProfile'

const G = { Forward: 'GST on invoice', RCM: 'RCM (TrustLab pays)', None: 'No GST' }
const SX = { '& .MuiTableCell-root': { fontSize: 12.5 }, '& .MuiTableCell-head': { fontSize: 11 } }

export default function OwnersBlock({ L }) {
  useStore()
  const sc = schedule(L); const me = isOwner() ? role().ownerId : null
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Owners &amp; share of payments</div>
      <div className="tbl-wrap">
        <Table size="small" className="otable" sx={SX}>
          <TableHead><TableRow>
            <TableCell>Owner</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">Maint.</TableCell><TableCell className="num">Deposit</TableCell><TableCell className="num">Advance</TableCell><TableCell>GST</TableCell><TableCell>TDS</TableCell><TableCell className="num">Rent now</TableCell><TableCell>Bank</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {(sc.owners || []).map(x => {
              const O = owner(x.ownerId); const sh = x.share
              return (
                <TableRow key={x.ownerId} className={me === x.ownerId ? 'youRow' : undefined}>
                  <TableCell><b>{O?.name || '—'}</b>{me === x.ownerId ? <> <StatusChip label="You" k="info" /></> : null}<div className="code">{O?.pan || ''}</div></TableCell>
                  <TableCell className="num">{pctLabel(sh.rent)}</TableCell>
                  <TableCell className="num">{pctLabel(sh.maint)}</TableCell>
                  <TableCell className="num">{pctLabel(sh.dep)}<div className="small muted">{inr(x.deposit)}{depAdjusted(L, x.ownerId) ? ` · held ${inr(depHeld(L, x.ownerId))}` : ''}</div></TableCell>
                  <TableCell className="num">{pctLabel(sh.adv)}{x.adv ? <div className="small muted">{inr(x.adv)}</div> : null}</TableCell>
                  <TableCell className="small">{G[x.mode] || x.mode}</TableCell>
                  <TableCell className="small">{x.tdsOn ? '10%' : 'Below threshold'}</TableCell>
                  <TableCell className="num">{inr(Math.round(rentFor(L, CUR) * sh.rent / 100))}</TableCell>
                  <TableCell className="small" sx={{ whiteSpace: 'nowrap' }}>{O ? <>{O.bankName || ''} {maskAcct(O.acctNo)} <BankChip O={O} /></> : ''}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="small muted" style={{ margin: '6px 0 0' }}>Each owner raises a separate invoice for their share and is paid to their own account. {tdsPerOwner(L) ? 'TDS is tested on each co-owner’s share of rent (co-owners with defined shares are separate payees) — confirm with your tax adviser.' : 'TDS is tested on the total rent.'}</p>
    </div>
  )
}
