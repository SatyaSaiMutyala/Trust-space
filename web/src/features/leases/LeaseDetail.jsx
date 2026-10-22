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
import { CUR, TODAY, fmtD, inr, perLabel, perAdd, addDays, ordinal, pctLabel } from '../../domain/utils'
import { leaseState, lockEnd, lockEndLessor, lockInLessee, lockInLessor, nextEsc, rentFor, rentBaseAt, escOn, escLabel, hasRentSteps, resolvedRentSteps, noticeBy, noticeByLessor, noticeLessee, noticeLessor, rentStartOf, isMulti, leaseOwners, ownerGstMode, tdsPerOwner, depAdjs, tdsRate, panValid } from '../../domain/lease'
import { useLeaseDeposit } from './useLeaseDeposit'
import { TableSkeleton } from '../../components/ui/Skeletons'
import { useLeaseSchedule } from './useLeaseSchedule'
import { Btn, Panel, FactGrid, Kpis, Kpi, Banner, Section } from '../../components/ui/Layout'
import { StatusChip, Seg } from '../../components/ui/Status'
import LeaseInspections from '../inspections/LeaseInspections'
import { activateLease, renewLease, schedMode, schedCsv } from './actions'
import { extendOpen } from '../../store/actions'
import { FileLinks } from '../../components/ui/Media'
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

function YrRow({ y, gstCol, arr }) {
  return (
    <TableRow className="yr">
      <TableCell><b>Year {y.y}</b><div className="small muted">{perLabel(y.from)} – {perLabel(y.to)}</div></TableCell>
      <TableCell /><TableCell />
      <TableCell className="num small">{y.lo === Infinity ? '—' : y.lo === y.hi ? inr(y.lo) : inr(y.lo) + '→' + inr(y.hi)}</TableCell>
      <TdM v={y.rent} /><TdM v={y.adj} neg /><TdM v={y.maint} /><TdM v={y[gstCol]} /><TdM v={y.tds} neg />
      <TableCell className="num"><b>{inr(y.net)}</b></TableCell>
      {arr ? <><TableCell className="num liab">{y.liab ? inr(y.liab) : '—'}<div className="small muted">at year end</div></TableCell><TableCell className="num">{inr(y.cash)}</TableCell></> : null}
      <TableCell />
    </TableRow>
  )
}

/** "Billed in" cell: the month the rent is invoiced, with same/next month under it. */
function BillTd({ r, arr }) {
  return <TableCell className="small nw">{perLabel(r.billIn)}<div className="muted">{arr ? 'next month' : 'same month'}</div></TableCell>
}

/** Arrears only: liability carried at month-end and the cash actually paid in the month (for the previous month). */
function ArrTds({ r }) {
  return <>
    <TableCell className="num liab">{r.liab ? inr(r.liab) : <span className="muted">—</span>}{r.liab ? <div className="small muted">accrued {fmtD(addDays(perAdd(r.p, 1) + '-01', -1))}</div> : null}</TableCell>
    <TableCell className="num">{r.cash ? <>{inr(r.cash)}<div className="small muted">for {perLabel(r.cashFor)}</div></> : <span className="muted">—</span>}</TableCell>
  </>
}

/** Which month's rent is billed when, and when it is due — "Paid in advance" / "Paid in arrears" (prototype timingNote). */
export function TimingNote({ sc, L }) {
  if (!sc.rows.length) return null
  if (!sc.timingSet) return <Banner sx={{ mb: 1.25 }}><b>Advance or arrears not set.</b> The schedule assumes rent is paid in advance until you choose. {isOwner() ? null : <Btn sm onClick={() => editLease(L.id)}>Set it now</Btn>}</Banner>
  const r = sc.rows.find(x => x.p === CUR) || sc.rows.find(x => x.rent) || sc.rows[0]
  const me = addDays(perAdd(r.p, 1) + '-01', -1)
  const step = (h, b) => <div className="tstep"><span className="eyebrow">{h}</span><span>{b}</span></div>
  return sc.arrears
    ? <div className="timing"><div><b>Paid in arrears</b> <span className="small muted">Each month’s rent is a liability at that month’s end and is billed and paid in the following month.</span></div>
        <div className="tflow">{step('Rent for', perLabel(r.p))}{step('Liability on', <>{fmtD(me)} · <b className="mono">{inr(r.net)}</b></>)}{step('Billed in', perLabel(r.billIn))}{step('Due by', fmtD(r.due))}</div>
        {sc.tail ? <div className="small muted">The last month ({perLabel(sc.tail.forP)}) is paid in {perLabel(sc.tail.p)}, after the term ends.</div> : null}</div>
    : <div className="timing"><div><b>Paid in advance</b> <span className="small muted">Each month’s rent is billed and paid in that same month. No rent liability is carried at month-end.</span></div>
        <div className="tflow">{step('Rent for', perLabel(r.p))}{step('Billed in', perLabel(r.billIn))}{step('Due by', fmtD(r.due))}{step('Liability at month-end', 'None once paid')}</div></div>
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
          <TableCell className="num">Total net</TableCell><TableCell>Billed in</TableCell><TableCell>Due by</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {sc.rows.map(r => (
            <TableRow key={r.p} className={`${r.esc ? 'escrow' : ''} ${r.p === CUR ? 'nowrow' : ''}`}>
              <TableCell>{perLabel(r.p)}{r.notes.length ? <div className="small muted">{r.notes.join(' · ')}</div> : null}</TableCell>
              {r.split.map(x => <TableCell key={x.ownerId} className="num">{inr(x.net)}{x.tds ? <div className="small muted">TDS {inr(x.tds)}</div> : null}</TableCell>)}
              <TableCell className="num"><b>{inr(r.net)}</b></TableCell>
              <TableCell className="small">{perLabel(r.billIn)}</TableCell>
              <TableCell className="small">{fmtD(r.due)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter><TableRow className="yr tot">
          <TableCell><b>Whole term</b></TableCell>
          {os.map(x => <TableCell key={x.ownerId} className="num"><b>{inr(x.net)}</b></TableCell>)}
          <TableCell className="num"><b>{inr(sc.tot.net)}</b></TableCell><TableCell /><TableCell />
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
  const arr = !!sc.arrears; const tl = sc.tail
  const body = []
  sc.years.forEach(y => {
    if (mode !== 'year') sc.rows.filter(r => r.y === y.y).forEach(r => body.push(
      <TableRow key={r.p} className={`${r.esc ? 'escrow' : ''} ${r.p === CUR ? 'nowrow' : ''}`}>
        <TableCell>{perLabel(r.p)}</TableCell>
        <BillTd r={r} arr={arr} />
        <TableCell className="small nw">{fmtD(r.due)}</TableCell>
        <TableCell className="num">{r.ch ? inr(r.rate) : '—'}</TableCell>
        <TdM v={r.rent} /><TdM v={r.adj} neg /><TdM v={r.maint} /><TdM v={r[gstCol]} /><TdM v={r.tds} neg />
        <TableCell className="num"><b>{inr(r.net)}</b></TableCell>
        {arr ? <ArrTds r={r} /> : null}
        <TableCell className="small">{r.notes.map((n, i) => <span key={i}>{i ? <br /> : null}{n}</span>)}</TableCell>
      </TableRow>
    ))
    body.push(<YrRow key={'y' + y.y} y={y} gstCol={gstCol} arr={arr} />)
  })
  // Arrears: the last month's rent is paid in the month after the term ends.
  if (tl) body.push(mode !== 'year'
    ? <TableRow key="tail" className="tailrow"><TableCell>{perLabel(tl.p)}<div className="small muted">after the term ends</div></TableCell><TableCell className="small nw">{perLabel(tl.p)}</TableCell><TableCell className="small nw">{fmtD(tl.due)}</TableCell><TableCell /><TableCell colSpan={6} className="small muted">No rent for this month — only the last month’s rent, billed now</TableCell><TableCell className="num muted">—<div className="small">liability cleared</div></TableCell><TableCell className="num">{inr(tl.net)}<div className="small muted">for {perLabel(tl.forP)}</div></TableCell><TableCell /></TableRow>
    : <TableRow key="tail" className="tailrow"><TableCell><b>After term</b><div className="small muted">{perLabel(tl.p)}</div></TableCell><TableCell /><TableCell /><TableCell /><TableCell colSpan={6} className="small muted">Last month’s rent ({perLabel(tl.forP)}) paid after the term ends</TableCell><TableCell className="num">—</TableCell><TableCell className="num">{inr(tl.net)}</TableCell><TableCell /></TableRow>)
  const t = sc.tot
  return (
    <div className="tbl-wrap sched">
      <Table size="small" sx={SCHED_SX}>
        <TableHead><TableRow>
          <TableCell>Rent for</TableCell><TableCell>Billed in</TableCell><TableCell>Due by</TableCell><TableCell className="num">Monthly rate</TableCell><TableCell className="num">Rent</TableCell><TableCell className="num">Adv. adj.</TableCell><TableCell className="num">Maint.</TableCell><TableCell className="num">{gstH}</TableCell><TableCell className="num">TDS</TableCell><TableCell className="num">Net to owner</TableCell>{arr ? <><TableCell className="num">Liability at month-end</TableCell><TableCell className="num">Paid this month</TableCell></> : null}<TableCell>Note</TableCell>
        </TableRow></TableHead>
        <TableBody>{body}</TableBody>
        <TableFooter><TableRow className="yr tot">
          <TableCell><b>Whole term</b></TableCell><TableCell /><TableCell /><TableCell />
          <TdM v={t.rent} /><TdM v={t.adj} neg /><TdM v={t.maint} /><TdM v={t[gstCol]} /><TdM v={t.tds} neg />
          <TableCell className="num"><b>{inr(t.net)}</b></TableCell>
          {arr ? <><TableCell className="num">—</TableCell><TableCell className="num"><b>{inr(t.cash + (tl ? tl.net : 0))}</b></TableCell></> : null}
          <TableCell />
        </TableRow></TableFooter>
      </Table>
    </div>
  )
}

/** One-line description of the schedule: term, escalation, payment timing. */
const schedSub = (L, sc) => `${fmtD(L.start)} to ${fmtD(sc.end)}${sc.end !== L.end ? ' (exit date)' : ''} · ${escOn(L) ? `${escLabel(L)}, ${L.escType === 'Amount' ? 'fixed amount' : L.escType === 'Simple' ? 'simple' : 'compounded'}` : 'no escalation'} · ${L.payTiming === 'Arrears' ? 'paid in arrears' : L.payTiming === 'Advance' ? 'paid in advance' : 'advance/arrears not set'}`

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
      <TimingNote sc={sc} L={L} />
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
        {['Active', 'Renewal due', 'Expired'].includes(st) ? <><Btn sm onClick={() => extendOpen(L.id)}>Extend</Btn><Btn sm onClick={() => renewLease(L.id)}>Renew</Btn></> : null}
        {['Active', 'Renewal due', 'Expired', 'Notice period'].includes(st) && +L.deposit ? <Btn sm onClick={() => depAdjOpen(L.id)}>Adjust deposit against rent</Btn> : null}
      </>}</div>}
    >
      <Box sx={{ display: 'grid', gap: '14px', gridTemplateColumns: 'minmax(0,1fr)' }}>
        <Section title="Lease terms"><FactGrid items={[
          ['Current rent', <><span className="mono">{inr(rentFor(L, CUR))}</span><span className="muted small">/mo</span></>, rentBaseAt(L, TODAY).step ? `Revised rent ${inr(rentBaseAt(L, TODAY).base)} from ${fmtD(rentBaseAt(L, TODAY).anchor)} (extension)` : `Base rent ${inr(L.rent)}`],
          ['Escalation', escLabel(L) || 'None', hasRentSteps(L) ? `${escOn(L) ? 'The rule runs between the changes listed below' : 'See Rent changes below'}${ne ? ' · next ' + fmtD(ne) : ''}` : escOn(L) ? `${L.escType === 'StepUp' ? `Flat until then, after that ${L.stepOn === 'simple' ? 'simple on the revised base' : 'compounded'}` : L.escType === 'Amount' ? 'Fixed amount added' : L.escType === 'Simple' ? 'Simple, on base rent' : 'Compounded'} from ${L.escFrom === 'Rent commencement' ? 'rent commencement' : 'lease start'}${ne ? ' · next ' + fmtD(ne) : ''}` : null],
          ['Security deposit', <><span className="mono">{inr(L.deposit)}</span>{L.depositPaid ? <StatusChip label="Paid" k="ok" /> : <StatusChip label="Pending" k="warn" />}</>, `${dep?.adjusted ? `${inr(dep.adjusted)} adjusted against rent · ${inr(dep.held)} held` : L.depositPaid ? 'Refundable at exit' : 'Not yet paid to the owner'}${L.depositPaid && (L.depositChannel || L.depositBank || L.depositUtr) ? ` · paid${L.depositChannel ? ' by ' + L.depositChannel : ''}${L.depositBank ? ' from ' + L.depositBank : ''}${L.depositUtr ? ' · ' + L.depositUtr : ''}` : ''}`],
          ['Lock-in', lockInLessee(L) || lockInLessor(L) ? `Lessee ${lockInLessee(L)} mo · Lessor ${lockInLessor(L)} mo` : 'None', le || lockEndLessor(L) ? `Tenant bound until ${le ? fmtD(le) : '—'}${lockInLessor(L) !== lockInLessee(L) ? ` · owner until ${lockEndLessor(L) ? fmtD(lockEndLessor(L)) : '—'}` : ''}` : null],
          ['Notice period', `Lessee ${noticeLessee(L)} mo · Lessor ${noticeLessor(L)} mo`, `Tenant serves by ${fmtD(noticeBy(L))}${noticeLessor(L) !== noticeLessee(L) ? ` · owner by ${fmtD(noticeByLessor(L))}` : ''}`],
          ['Rent payment', !L.payTiming ? <StatusChip key="pt" label="Not set" k="warn" /> : L.payTiming === 'Arrears' ? 'In arrears — billed next month' : 'In advance — billed same month', !L.payTiming ? 'Choose advance or arrears in the lease' : `By the ${ordinal(L.dueDay)} ${L.payTiming === 'Arrears' ? 'of the following month' : 'of the month'}`],
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
        {isMulti(L) || (!o && L.status !== 'Draft') ? <Section title={isMulti(L) ? 'Owners & share of payments' : 'Owner'} sub={isMulti(L) ? null : 'Add a co-owner here if the property changes hands in part'}><OwnersBlock L={L} heading={false} /></Section> : null}
        {depAdjs(L, null, true).length ? <Section title="Security deposit adjusted against rent"><DepAdjTable L={L} heading={false} /></Section> : null}
        {hasRentSteps(L) ? <Section title="Rent changes" sub={escOn(L) ? `As written in the agreement. Each change replaces the rule (${escLabel(L).split(' · ')[0]}) on its date and applies on the rent in force just before it; the rule then continues from that date.` : 'As written in the agreement. Each change applies on the rent in force just before it; after the last one the rent stays there.'}><div className="tbl-wrap"><table className="otable"><thead><tr><th>From</th><th>Change</th><th className="num">Rent before</th><th className="num">Rent after</th></tr></thead><tbody>{resolvedRentSteps(L).map(s => <tr key={s.id || s.from}><td>{fmtD(s.from)}</td><td>{s.extension ? 'Extension — revised rent' : s.kind === 'pct' ? `+${s.value}%` : s.kind === 'amt' ? `+${inr(s.value)} per month` : 'New rent'}{s.every ? <span className="small muted">{s.repeat ? ' · repeat' : ` · every ${s.every} months${s.until ? ' until ' + fmtD(s.until) : ''}`}</span> : null}</td><td className="num mono">{inr(s.before)}</td><td className="num mono"><b>{inr(s.rent)}</b></td></tr>)}</tbody></table></div></Section> : null}
        {(L.extensions || []).length ? <Section title="Extensions" sub="The same agreement, running longer. Earlier invoices and the ledger were not changed."><div className="list">{L.extensions.slice().reverse().map(x => <div key={x.id} className="li"><span className="when">{fmtD(x.at)}</span><div className="grow"><div>Extended from {fmtD(x.fromEnd)} to <b>{fmtD(x.toEnd)}</b>{+x.rent > 0 ? <> · rent <span className="mono">{inr(x.rent)}</span> from {fmtD(x.rentFrom)}</> : ' · rent as before'}</div><div className="small muted">{x.ref || 'No reference'} · {x.by}{x.file ? <> · <FileLinks files={[x.file]} /></> : null}</div></div></div>)}</div></Section> : null}
        <Section title="Key clauses"><div style={{ maxWidth: '75ch' }}>{L.clauses || '—'}</div></Section>
        <Section title="Joint inspections"><LeaseInspections L={L} /></Section>
        {!sc ? <Section title="Rent schedule — full term"><TableSkeleton rows={6} cols={8} panel={false} /></Section>
          : sc.rows.length ? <Section title="Rent schedule — full term" sub={schedSub(L, sc)} actions={<Btn sm onClick={() => schedCsv(L.id)}>Download (CSV)</Btn>}><SchedulePanel L={L} headerless /></Section> : null}
      </Box>
    </Panel>
  )
}
