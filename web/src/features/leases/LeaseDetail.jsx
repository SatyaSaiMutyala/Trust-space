/* Lease detail panel + full-term rent schedule — port of leaseDetail, schedTotalsHTML, ownerSplitTable, scheduleByOwner, scheduleTable, schedulePanel (prototype). */
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableFooter from '@mui/material/TableFooter'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, UI, isOwner, role, owner } from '../../store/store'
import { editLease, depAdjOpen } from '../../store/actions'
import { CUR, fmtD, inr, perLabel, ordinal, pctLabel } from '../../domain/utils'
import { leaseState, lockEnd, nextEsc, rentFor, noticeBy, rentStartOf, isMulti, leaseOwners, ownerGstMode, tdsPerOwner, depAdjs, tdsRate, panValid } from '../../domain/lease'
import { useLeaseDeposit } from './useLeaseDeposit'
import { TableSkeleton } from '../../components/ui/Skeletons'
import { useLeaseSchedule } from './useLeaseSchedule'
import { Btn, Panel, FactGrid, Kpis, Kpi, Banner, Section } from '../../components/ui/Layout'
import { StatusChip, Seg } from '../../components/ui/Status'
import LeaseInspections from '../inspections/LeaseInspections'
import { activateLease, renewLease, schedMode, schedCsv } from './actions'
import OwnersBlock from './OwnersBlock'
import DepAdjTable from './DepAdjTable'

const OTABLE_SX = { '& .MuiTableCell-root': { fontSize: 12.5 }, '& .MuiTableCell-head': { fontSize: 11 }, '& .MuiTableCell-footer': { color: 'var(--ink)' } }

/** Split by owner — whole term (ownerSplitTable). */
export function OwnerSplitTable({ sc }) {
  const me = isOwner() ? role().ownerId : null
  const os = sc.owners || []; const t = k => os.reduce((a, x) => a + x[k], 0)
  return (
    <div className="tbl-wrap" style={{ marginBottom: 12 }}>
      <Table size="small" className="otable" sx={OTABLE_SX}>
        <TableHead><TableRow>
          <TableCell>Split by owner — whole term</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">Adv. adj.</TableCell><TableCell className="num">Maint.</TableCell><TableCell className="num">GST</TableCell><TableCell className="num">RCM</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Net to owner</TableCell><TableCell className="num">Deposit</TableCell><TableCell className="num">Advance</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {os.map(x => (
            <TableRow key={x.ownerId} className={me === x.ownerId ? 'youRow' : undefined}>
              <TableCell><b>{owner(x.ownerId)?.name || '—'}</b> <span className="small muted">{pctLabel(x.share.rent)}</span></TableCell>
              <TableCell className="num">{inr(x.rent)}</TableCell>
              <TableCell className="num">{x.adj ? '−' + inr(x.adj) : '—'}</TableCell>
              <TableCell className="num">{inr(x.maint)}</TableCell>
              <TableCell className="num">{x.gst ? inr(x.gst) : '—'}</TableCell>
              <TableCell className="num">{x.rcm ? inr(x.rcm) : '—'}</TableCell>
              <TableCell className="num">{x.tds ? '−' + inr(x.tds) : '—'}</TableCell>
              <TableCell className="num"><b>{inr(x.net)}</b></TableCell>
              <TableCell className="num">{inr(x.deposit)}</TableCell>
              <TableCell className="num">{x.adv ? inr(x.adv) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter><TableRow className="yr">
          <TableCell><b>Total</b></TableCell>
          <TableCell className="num">{inr(t('rent'))}</TableCell>
          <TableCell className="num">{t('adj') ? '−' + inr(t('adj')) : '—'}</TableCell>
          <TableCell className="num">{inr(t('maint'))}</TableCell>
          <TableCell className="num">{inr(t('gst'))}</TableCell>
          <TableCell className="num">{inr(t('rcm'))}</TableCell>
          <TableCell className="num">{t('tds') ? '−' + inr(t('tds')) : '—'}</TableCell>
          <TableCell className="num"><b>{inr(t('net'))}</b></TableCell>
          <TableCell className="num">{inr(t('deposit'))}</TableCell>
          <TableCell className="num">{inr(t('adv'))}</TableCell>
        </TableRow></TableFooter>
      </Table>
    </div>
  )
}

/** KPI strip, "At signing" strip and unadjusted-advance warning (schedTotalsHTML). */
export function SchedTotals({ sc, L }) {
  const u = sc.upfront || {}; const t = sc.tot
  const cost = t.rent - 0 + t.maint + (L.gstMode === 'Forward' ? t.gst + u.advGst : 0) + u.brokerage + u.stamp
  return (
    <>
      <Kpis>
        <Kpi label="Rent over term" value={inr(t.rent)} sub={`${t.months} months · avg ${inr(t.rent / Math.max(1, sc.rows.filter(r => r.ch).length))}/mo`} />
        <Kpi label="Maintenance" value={inr(t.maint)} />
        <Kpi label={L.gstMode === 'RCM' ? 'GST under RCM (TrustLab)' : 'GST paid to owner'} value={inr(L.gstMode === 'RCM' ? t.rcm : t.gst + u.advGst)} sub={L.gstMode === 'None' ? 'Not applicable' : 'Input credit claimable'} />
        <Kpi label="TDS deducted" value={inr(t.tds + u.advTds)} sub="Deposited against owner’s PAN" />
        <Kpi label="Net paid to owner" value={inr(t.net + u.adv + u.advGst - u.advTds)} sub="Rent, maintenance, GST less TDS, incl. advance" />
        <Kpi label="Total occupancy cost" value={inr(cost)} sub="Excludes refundable deposit" />
      </Kpis>
      <div className="upfront">
        <span className="eyebrow">At signing</span>
        <span>Security deposit <b className="mono">{inr(u.deposit)}</b> <span className="small muted">refundable</span></span>
        {u.adv ? <span>Advance rent <b className="mono">{inr(u.adv)}</b>{u.advGst ? ` + GST ${inr(u.advGst)}` : ''}{u.advTds ? ` − TDS ${inr(u.advTds)}` : ''}</span> : null}
        {u.stamp ? <span>Stamp duty &amp; registration <b className="mono">{inr(u.stamp)}</b></span> : null}
        {u.brokerage ? <span>Brokerage <b className="mono">{inr(u.brokerage)}</b></span> : null}
        <span>Paid at signing <b className="mono">{inr(u.deposit + u.adv + u.advGst - u.advTds + u.stamp + u.brokerage)}</b></span>
      </div>
      {isMulti(L) ? <OwnerSplitTable sc={sc} /> : null}
      {sc.unadjusted > 0 ? <Banner>Advance rent of {inr(sc.unadjusted)} cannot be adjusted within the term — reduce it or shorten the adjustment period.</Banner> : null}
    </>
  )
}

function TdM({ v, neg }) {
  return <TableCell className="num">{v ? (neg ? '−' : '') + inr(v) : <span className="muted">—</span>}</TableCell>
}

function YrRow({ y, gstCol }) {
  return (
    <TableRow className="yr">
      <TableCell><b>Year {y.y}</b><div className="small muted">{perLabel(y.from)} – {perLabel(y.to)}</div></TableCell>
      <TableCell className="num small">{y.lo === Infinity ? '—' : y.lo === y.hi ? inr(y.lo) : inr(y.lo) + '→' + inr(y.hi)}</TableCell>
      <TdM v={y.rent} /><TdM v={y.adj} neg /><TdM v={y.maint} /><TdM v={y[gstCol]} /><TdM v={y.tds} neg />
      <TableCell className="num"><b>{inr(y.net)}</b></TableCell><TableCell /><TableCell />
    </TableRow>
  )
}

/* Phones/tablets: the Month column stays put while the money columns scroll; notes get room so rows stay short. */
const SCHED_SX = {
  '& .MuiTableCell-root': { fontSize: 12.5, lineHeight: 1.5 }, '& .MuiTableCell-head': { fontSize: 11 }, '& .MuiTableCell-footer': { color: 'var(--ink)' },
  '& .MuiTableCell-root:last-of-type': { minWidth: 180 },
  '@media (max-width:760px)': {
    '& .MuiTableCell-root:first-of-type': { position: 'sticky', left: 0, zIndex: 1, bgcolor: 'var(--surface)', borderRight: '1px solid var(--line)', whiteSpace: 'nowrap' },
    '& thead .MuiTableCell-root:first-of-type, & tfoot .MuiTableCell-root:first-of-type': { zIndex: 3 },
  },
}

/** Net to each co-owner, month by month (scheduleByOwner). */
function ScheduleByOwner({ sc }) {
  const os = sc.owners || []
  return (
    <div className="tbl-wrap sched">
      <Table size="small" sx={SCHED_SX}>
        <TableHead><TableRow>
          <TableCell>Month</TableCell>
          {os.map(x => <TableCell key={x.ownerId} className="num">{owner(x.ownerId)?.name || '—'}<div className="small muted" style={{ textTransform: 'none', letterSpacing: 0 }}>{pctLabel(x.share.rent)} · net</div></TableCell>)}
          <TableCell className="num">Total net</TableCell><TableCell>Due by</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {sc.rows.map(r => (
            <TableRow key={r.p} className={`${r.esc ? 'escrow' : ''} ${r.p === CUR ? 'nowrow' : ''}`}>
              <TableCell>{perLabel(r.p)}{r.notes.length ? <div className="small muted">{r.notes.join(' · ')}</div> : null}</TableCell>
              {r.split.map(x => <TableCell key={x.ownerId} className="num">{inr(x.net)}{x.tds ? <div className="small muted">TDS {inr(x.tds)}</div> : null}</TableCell>)}
              <TableCell className="num"><b>{inr(r.net)}</b></TableCell>
              <TableCell className="small">{fmtD(r.due)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter><TableRow className="yr tot">
          <TableCell><b>Whole term</b></TableCell>
          {os.map(x => <TableCell key={x.ownerId} className="num"><b>{inr(x.net)}</b></TableCell>)}
          <TableCell className="num"><b>{inr(sc.tot.net)}</b></TableCell><TableCell />
        </TableRow></TableFooter>
      </Table>
    </div>
  )
}

/** Month-by-month (mode 'month'), year-by-year (mode 'year') or by-owner (mode 'owner', co-owned leases) schedule table (scheduleTable). */
export function ScheduleTable({ sc, L, mode }) {
  if (mode === 'owner' && isMulti(L)) return <ScheduleByOwner sc={sc} />
  const modes = new Set(leaseOwners(L).map(o => ownerGstMode(L, o.ownerId))); const mixed = modes.has('Forward') && modes.has('RCM')
  const gstCol = !mixed && modes.has('RCM') ? 'rcm' : 'gst'; const gstH = mixed ? 'GST (on invoice)' : gstCol === 'rcm' ? 'GST (RCM)' : 'GST'
  const body = []
  sc.years.forEach(y => {
    if (mode !== 'year') sc.rows.filter(r => r.y === y.y).forEach(r => body.push(
      <TableRow key={r.p} className={`${r.esc ? 'escrow' : ''} ${r.p === CUR ? 'nowrow' : ''}`}>
        <TableCell>{perLabel(r.p)}</TableCell>
        <TableCell className="num">{r.ch ? inr(r.rate) : '—'}</TableCell>
        <TdM v={r.rent} /><TdM v={r.adj} neg /><TdM v={r.maint} /><TdM v={r[gstCol]} /><TdM v={r.tds} neg />
        <TableCell className="num"><b>{inr(r.net)}</b></TableCell>
        <TableCell className="small">{fmtD(r.due)}</TableCell>
        <TableCell className="small">{r.notes.map((n, i) => <span key={i}>{i ? <br /> : null}{n}</span>)}</TableCell>
      </TableRow>
    ))
    body.push(<YrRow key={'y' + y.y} y={y} gstCol={gstCol} />)
  })
  const t = sc.tot
  return (
    <div className="tbl-wrap sched">
      <Table size="small" sx={SCHED_SX}>
        <TableHead><TableRow>
          <TableCell>Month</TableCell><TableCell className="num">Monthly rate</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">Adv. adj.</TableCell><TableCell className="num">Maint.</TableCell><TableCell className="num">{gstH}</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Net to owner</TableCell><TableCell>Due by</TableCell><TableCell>Note</TableCell>
        </TableRow></TableHead>
        <TableBody>{body}</TableBody>
        <TableFooter><TableRow className="yr tot">
          <TableCell><b>Whole term</b></TableCell><TableCell />
          <TdM v={t.rent} /><TdM v={t.adj} neg /><TdM v={t.maint} /><TdM v={t[gstCol]} /><TdM v={t.tds} neg />
          <TableCell className="num"><b>{inr(t.net)}</b></TableCell><TableCell /><TableCell />
        </TableRow></TableFooter>
      </Table>
    </div>
  )
}

/** One-line description of the schedule: term, escalation, payment timing. */
const schedSub = (L, sc) => `${fmtD(L.start)} to ${fmtD(sc.end)}${sc.end !== L.end ? ' (exit date)' : ''} · ${L.escPct ? `${L.escPct}% every ${L.escEvery} months, ${L.escType === 'Simple' ? 'simple' : 'compounded'}` : 'no escalation'} · ${L.payTiming === 'Arrears' ? 'paid in arrears' : 'paid in advance'}`

/** Rent schedule — full term, with Monthly/Yearly toggle and CSV download (schedulePanel). headerless: the caller shows the title.
    The schedule comes from the API (useLeaseSchedule). */
export function SchedulePanel({ L, headerless }) {
  useStore()
  const { sc } = useLeaseSchedule(L.id)
  if (!sc) return <TableSkeleton rows={6} cols={8} panel={false} />
  if (!sc.rows.length) return null
  const mode = UI.schedMode || 'month'
  return (
    <div>
      {headerless ? null : <div className="filters" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="eyebrow">Rent schedule — full term</div>
          <span className="small muted">{schedSub(L, sc)}</span>
        </div>
        <Btn sm onClick={() => schedCsv(L.id)}>Download (CSV)</Btn>
      </div>}
      <SchedTotals sc={sc} L={L} />
      {/* The view switch only changes the month-by-month table below, so it sits right above it — not above the totals and owner split. */}
      <div className="filters" style={{ justifyContent: 'space-between', margin: '14px 0 8px' }}>
        <div className="eyebrow">{mode === 'year' ? 'Year by year' : mode === 'owner' ? 'Month by month — per owner' : 'Month by month'}</div>
        <Seg ariaLabel="Schedule view" options={[['month', 'Monthly'], ['year', 'Yearly'], ...(isMulti(L) ? [['owner', 'By owner']] : [])]} value={mode} onChange={schedMode} />
      </div>
      <ScheduleTable sc={sc} L={L} mode={mode} />
    </div>
  )
}

const GST_TXT = { Forward: '18% charged by owner (forward charge)', RCM: '18% paid by TrustLab under reverse charge', None: 'Not applicable' }

export default function LeaseDetail({ L }) {
  useStore()
  const st = leaseState(L); const le = lockEnd(L); const ne = nextEsc(L); const o = isOwner()
  const { sc } = useLeaseSchedule(L.id); const { dep } = useLeaseDeposit(L.id)
  return (
    <Panel
      title={<h2>{L.ref}</h2>}
      sub={`${fmtD(L.start)} – ${fmtD(L.end)}`}
      actions={<div className="actions"><StatusChip label={st} />{o ? null : <>
        <Btn sm onClick={() => editLease(L.id)}>Edit</Btn>
        {st === 'Draft' ? <Btn sm primary onClick={() => activateLease(L.id)}>Mark signed &amp; active</Btn> : null}
        {['Active', 'Renewal due', 'Expired'].includes(st) ? <Btn sm onClick={() => renewLease(L.id)}>Renew</Btn> : null}
        {['Active', 'Renewal due', 'Expired', 'Notice period'].includes(st) && +L.deposit ? <Btn sm onClick={() => depAdjOpen(L.id)}>Adjust deposit against rent</Btn> : null}
      </>}</div>}
    >
      <Box sx={{ display: 'grid', gap: '14px', gridTemplateColumns: 'minmax(0,1fr)' }}>
        <Section title="Lease terms"><FactGrid items={[
          ['Current rent', <><span className="mono">{inr(rentFor(L, CUR))}</span><span className="muted small">/mo</span></>, `Base rent ${inr(L.rent)}`],
          ['Escalation', L.escPct ? `${L.escPct}% every ${L.escEvery} months` : 'None', L.escPct ? `${L.escType === 'Simple' ? 'Simple, on base rent' : 'Compounded'} from ${L.escFrom === 'Rent commencement' ? 'rent commencement' : 'lease start'}${ne ? ' · next ' + fmtD(ne) : ''}` : null],
          ['Security deposit', <><span className="mono">{inr(L.deposit)}</span>{L.depositPaid ? <StatusChip label="Paid" k="ok" /> : <StatusChip label="Pending" k="warn" />}</>, dep?.adjusted ? `${inr(dep.adjusted)} adjusted against rent · ${inr(dep.held)} held` : L.depositPaid ? 'Refundable at exit' : 'Not yet paid to the owner'],
          ['Lock-in', L.lockIn ? `${L.lockIn} months` : 'None', L.lockIn ? `Ends ${fmtD(le)}` : null],
          ['Notice period', `${L.notice} months`, `Serve by ${fmtD(noticeBy(L))}`],
          ['Rent payment', L.payTiming === 'Arrears' ? 'In arrears' : 'In advance', `By the ${ordinal(L.dueDay)} ${L.payTiming === 'Arrears' ? 'of the following month' : 'of the month'}`],
          ['Rent-free period', `${L.fitout || 0} days`, `Rent from ${fmtD(rentStartOf(L))}`],
          ['Advance rent', +L.advanceRent ? inr(L.advanceRent) : 'None', +L.advanceRent ? `Adjusted over ${L.advanceMonths || 1} month${(L.advanceMonths || 1) > 1 ? 's' : ''}` : null],
        ]} /></Section>
        <Section title="Charges, tax & registration"><FactGrid items={[
          ['Maintenance', L.maintType, L.maint ? `${inr(L.maint)}/month${L.maintEsc ? ' · escalates with rent' : ''}` : null],
          ['Electricity', L.elec, null],
          ['GST on rent', isMulti(L) ? 'Per owner' : { Forward: '18% on invoice', RCM: '18% under RCM', None: 'Not applicable' }[L.gstMode] || L.gstMode, isMulti(L) ? 'See owners & share of payments' : GST_TXT[L.gstMode]],
          ['TDS on rent', L.tds ? (isMulti(L) ? '10%' : !panValid(owner(L.ownerId)) ? <span key="t" style={{ color: 'var(--bad)' }}>20% — no valid PAN</span> : `${tdsRate(L.ownerId, CUR + '-01')}%`) : 'Not deducted',
            L.tds ? `s.393 (formerly 194-I) · when rent exceeds ₹50,000/month${isMulti(L) ? ' · 20% for a co-owner without a valid PAN' : ''}${tdsPerOwner(L) ? ' · tested on each co-owner’s share' : ''}${!isMulti(L) && !panValid(owner(L.ownerId)) ? ' · 10% once a valid PAN is on file' : ''}` : null],
          ['Registration', L.registered ? 'Registered' : 'Unregistered', L.stamp ? `Stamp duty & registration ${inr(L.stamp)}` : null],
        ]} /></Section>
        {isMulti(L) ? <Section title="Owners & share of payments"><OwnersBlock L={L} heading={false} /></Section> : null}
        {depAdjs(L, null, true).length ? <Section title="Security deposit adjusted against rent"><DepAdjTable L={L} heading={false} /></Section> : null}
        <Section title="Key clauses"><div style={{ maxWidth: '75ch' }}>{L.clauses || '—'}</div></Section>
        <Section title="Joint inspections"><LeaseInspections L={L} /></Section>
        {!sc ? <Section title="Rent schedule — full term"><TableSkeleton rows={6} cols={8} panel={false} /></Section>
          : sc.rows.length ? <Section title="Rent schedule — full term" sub={schedSub(L, sc)} actions={<Btn sm onClick={() => schedCsv(L.id)}>Download (CSV)</Btn>}><SchedulePanel L={L} headerless /></Section> : null}
      </Box>
    </Panel>
  )
}
