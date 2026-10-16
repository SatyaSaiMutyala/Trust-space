/* Opening balances (prototype viewOpening). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { S, prop, owner, useStore } from '../../store/store'
import { obEdit } from '../../store/actions'
import { inr, fmtD, perLabel } from '../../domain/utils'
import { OB_DATE, obItems, obOut, isMulti, ownersLabel } from '../../domain/lease'
import { PageHead, Kpis, Kpi, TableCard, Btn, Stack } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import ObMonthTable from './ObMonthTable'

export default function OpeningPage() {
  useStore()
  const leases = S.leases.filter(L => L.status !== 'Draft' && L.start < OB_DATE)
  const all = leases.flatMap(L => obItems(L))
  const tot = all.reduce((a, it) => a + (+it.amount || 0), 0), out = all.reduce((a, it) => a + obOut(it), 0)
  return (
    <Stack>
      <PageHead title="Opening balances" sub={`Rent and other dues outstanding to owners as on ${fmtD(OB_DATE)}, entered month by month for every lease that started before then. They carry into ledgers, rent status, payables and alerts, and are cleared as they are paid.`} />
      <SampleBanner />
      <Kpis>
        <Kpi label={'Due as on ' + fmtD(OB_DATE)} value={inr(tot)} sub={`${all.length} month entries`} />
        <Kpi label="Paid since" value={inr(all.reduce((a, it) => a + (+it.paidAmount || 0) + (+it.tds || 0), 0))} sub="Incl. TDS" />
        <Kpi label="Still outstanding" value={inr(out)} sub={`${all.filter(obOut).length} entries`} alert={!!out} />
        <Kpi label="Leases confirmed" value={`${leases.filter(L => L.opening?.confirmed).length} / ${leases.length}`} sub="Opening balance agreed with owner" />
      </Kpis>
      <TableCard>
        <TableHead><TableRow><TableCell>Premises / lease</TableCell><TableCell>Owner(s)</TableCell><TableCell>Months due on {fmtD(OB_DATE)}</TableCell><TableCell className="num">Amount due</TableCell><TableCell className="num">Outstanding</TableCell><TableCell>Confirmed</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {leases.map(L => {
            const its = obItems(L).sort((a, b) => a.period.localeCompare(b.period)); const t = its.reduce((a, it) => a + (+it.amount || 0), 0), o = its.reduce((a, it) => a + obOut(it), 0)
            return (
              <TableRow key={L.id}>
                <TableCell><b>{prop(L.propertyId)?.name || ''}</b><div className="code">{prop(L.propertyId)?.code || ''} · {L.ref}</div></TableCell>
                <TableCell className="small">{ownersLabel(L)}</TableCell>
                <TableCell><div className="obchips">{L.opening ? (its.length ? its.map(it => <span key={it.id} className={'obchip ' + (obOut(it) ? 'due' : 'paid')} title={it.type + (isMulti(L) ? ' · ' + (owner(it.ownerId)?.name || '') : '')}>{perLabel(it.period)}{it.type !== 'Rent' ? ' · ' + it.type[0] : ''} <b>{inr(it.amount)}</b></span>) : <span className="small muted">Nothing due — nil balance</span>) : <span className="small muted">Not entered yet</span>}</div></TableCell>
                <TableCell className="num">{L.opening ? inr(t) : '—'}</TableCell>
                <TableCell className="num">{L.opening ? <b>{inr(o)}</b> : '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{L.opening?.confirmed ? <StatusChip label={'Agreed ' + fmtD(L.opening.confirmedOn)} k="ok" /> : L.opening ? <StatusChip label="Not confirmed" k="warn" /> : <StatusChip label="Pending" k="idle" />}</TableCell>
                <TableCell><Btn sm primary={!L.opening} onClick={() => obEdit(L.id)}>{L.opening ? 'Edit' : 'Enter balance'}</Btn></TableCell>
              </TableRow>
            )
          })}
          {leases.length ? null : <TableRow><TableCell colSpan={7} className="empty">No leases started before {fmtD(OB_DATE)}.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
      <ObMonthTable leases={leases} types={null} ownerId={null} compact={false} />
    </Stack>
  )
}
