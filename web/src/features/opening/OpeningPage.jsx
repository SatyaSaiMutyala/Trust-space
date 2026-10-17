/* Opening balances (prototype viewOpening). The figures come from the API (GET /api/opening — computed on the server). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { S, prop, owner, useStore } from '../../store/store'
import { obEdit } from '../../store/actions'
import { inr, fmtD, perLabel } from '../../domain/utils'
import { OB_DATE, isMulti, ownersLabel } from '../../domain/lease'
import { PageHead, Kpis, Kpi, TableCard, Btn, Stack } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import { KpiSkeleton, TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import ObMonthTable from './ObMonthTable'
import { useOpening } from './useOpening'

export default function OpeningPage() {
  useStore()
  const { opening: O, isFetching } = useOpening()
  const head = <PageHead title="Opening balances" sub={`Rent and other dues outstanding to owners as on ${fmtD(OB_DATE)}, entered month by month for every lease that started before then. They carry into ledgers, rent status, payables and alerts, and are cleared as they are paid.`} />
  if (!O) return <Stack>{head}<SampleBanner /><KpiSkeleton count={4} /><TableSkeleton rows={5} cols={7} /></Stack>
  const T = O.totals; const leases = O.leases.map(l => ({ ...l, L: S.leases.find(x => x.id === l.leaseId) })).filter(l => l.L)
  return (
    <Stack>
      {head}
      <SampleBanner />
      <Refreshing on={isFetching}>
        <Kpis>
          <Kpi label={'Due as on ' + fmtD(OB_DATE)} value={inr(T.due)} sub={`${T.entries} month entries`} />
          <Kpi label="Paid since" value={inr(T.paid)} sub="Incl. TDS" />
          <Kpi label="Still outstanding" value={inr(T.outstanding)} sub={`${T.outEntries} entries`} alert={!!T.outstanding} />
          <Kpi label="Leases confirmed" value={`${T.confirmedLeases} / ${T.leases}`} sub="Opening balance agreed with owner" />
        </Kpis>
      </Refreshing>
      <TableCard>
        <TableHead><TableRow><TableCell>Premises / lease</TableCell><TableCell>Owner(s)</TableCell><TableCell>Months due on {fmtD(OB_DATE)}</TableCell><TableCell className="num">Amount due</TableCell><TableCell className="num">Outstanding</TableCell><TableCell>Confirmed</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {leases.map(({ L, items, total, outstanding, entered, confirmed, confirmedOn }) => (
            <TableRow key={L.id}>
              <TableCell><b>{prop(L.propertyId)?.name || ''}</b><div className="code">{prop(L.propertyId)?.code || ''} · {L.ref}</div></TableCell>
              <TableCell className="small">{ownersLabel(L)}</TableCell>
              <TableCell><div className="obchips">{entered ? (items.length ? items.map(it => <span key={it.id} className={'obchip ' + (it.out ? 'due' : 'paid')} title={it.type + (isMulti(L) ? ' · ' + (owner(it.ownerId)?.name || '') : '')}>{perLabel(it.period)}{it.type !== 'Rent' ? ' · ' + it.type[0] : ''} <b>{inr(it.amount)}</b></span>) : <span className="small muted">Nothing due — nil balance</span>) : <span className="small muted">Not entered yet</span>}</div></TableCell>
              <TableCell className="num">{entered ? inr(total) : '—'}</TableCell>
              <TableCell className="num">{entered ? <b>{inr(outstanding)}</b> : '—'}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{confirmed ? <StatusChip label={'Agreed ' + fmtD(confirmedOn)} k="ok" /> : entered ? <StatusChip label="Not confirmed" k="warn" /> : <StatusChip label="Pending" k="idle" />}</TableCell>
              <TableCell><Btn sm primary={!entered} onClick={() => obEdit(L.id)}>{entered ? 'Edit' : 'Enter balance'}</Btn></TableCell>
            </TableRow>
          ))}
          {leases.length ? null : <TableRow><TableCell colSpan={7} className="empty">No leases started before {fmtD(OB_DATE)}.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
      <ObMonthTable leases={leases.map(l => l.L)} types={null} ownerId={null} compact={false} />
    </Stack>
  )
}
