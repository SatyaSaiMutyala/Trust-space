/* Lease detail panel + full-term rent schedule — port of leaseDetail, schedTotalsHTML, scheduleTable, schedulePanel (reference/TruSpace.html). */
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableFooter from '@mui/material/TableFooter'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, UI, isOwner } from '../../store/store'
import { editLease } from '../../store/actions'
import { CUR, fmtD, inr, perLabel, ordinal } from '../../domain/utils'
import { leaseState, lockEnd, nextEsc, rentFor, noticeBy, rentStartOf, schedule } from '../../domain/lease'
import { inspOf } from '../../domain/inspection'
import { Btn, Panel, Facts, Kpis, Kpi, Banner } from '../../components/ui/Layout'
import { StatusChip, Seg } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import InspectionActions from '../inspections/InspectionActions'
import { activateLease, renewLease, schedMode, schedCsv } from './actions'

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

/** Month-by-month (mode 'month') or year-by-year (mode 'year') schedule table (scheduleTable). */
export function ScheduleTable({ sc, L, mode }) {
  const gstCol = L.gstMode === 'RCM' ? 'rcm' : 'gst'; const gstH = L.gstMode === 'RCM' ? 'GST (RCM)' : 'GST'
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

/** Rent schedule — full term, with Monthly/Yearly toggle and CSV download (schedulePanel). */
export function SchedulePanel({ L }) {
  useStore()
  const sc = schedule(L); if (!sc.rows.length) return null
  const mode = UI.schedMode || 'month'
  return (
    <div>
      <div className="filters" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div className="eyebrow">Rent schedule — full term</div>
          <span className="small muted">{fmtD(L.start)} to {fmtD(sc.end)}{sc.end !== L.end ? ' (exit date)' : ''} · {L.escPct ? `${L.escPct}% every ${L.escEvery} months, ${L.escType === 'Simple' ? 'simple' : 'compounded'}` : 'no escalation'} · {L.payTiming === 'Arrears' ? 'paid in arrears' : 'paid in advance'}</span>
        </div>
        <div className="actions">
          <Seg ariaLabel="Schedule view" options={[['month', 'Monthly'], ['year', 'Yearly']]} value={mode} onChange={schedMode} />
          <Btn sm onClick={() => schedCsv(L.id)}>Download (CSV)</Btn>
        </div>
      </div>
      <SchedTotals sc={sc} L={L} />
      <ScheduleTable sc={sc} L={L} mode={mode} />
    </div>
  )
}

const GST_TXT = { Forward: '18% charged by owner (forward charge)', RCM: '18% paid by TrustLab under reverse charge', None: 'Not applicable' }

export default function LeaseDetail({ L }) {
  useStore()
  const st = leaseState(L); const le = lockEnd(L); const ne = nextEsc(L); const o = isOwner()
  const hasInspBtn = inspOf(L.id, 'Move-in') || !o || inspOf(L.id, 'Move-out')
  return (
    <Panel
      title={<h2>{L.ref}</h2>}
      sub={`${fmtD(L.start)} – ${fmtD(L.end)}`}
      actions={<div className="actions"><StatusChip label={st} />{o ? null : <>
        <Btn sm onClick={() => editLease(L.id)}>Edit</Btn>
        {st === 'Draft' ? <Btn sm primary onClick={() => activateLease(L.id)}>Mark signed &amp; active</Btn> : null}
        {['Active', 'Renewal due', 'Expired'].includes(st) ? <Btn sm onClick={() => renewLease(L.id)}>Renew</Btn> : null}
      </>}</div>}
    >
      <Box sx={{ display: 'grid', gap: '18px', gridTemplateColumns: 'minmax(0,1fr)' }}>
        <Facts items={[
          ['Current rent', <><span className="mono">{inr(rentFor(L, CUR))}</span>/mo</>],
          ['Base rent', <span key="b" className="mono">{inr(L.rent)}</span>],
          ['Escalation', L.escPct ? `${L.escPct}% every ${L.escEvery} months` : 'None'],
          ['Next escalation', ne ? fmtD(ne) : '—'],
          ['Security deposit', <><span className="mono">{inr(L.deposit)}</span> {L.depositPaid ? <StatusChip label="Paid" k="ok" /> : <StatusChip label="Pending" k="warn" />}</>],
          ['Lock-in', L.lockIn ? `${L.lockIn} months · ends ${fmtD(le)}` : 'None'],
          ['Notice period', `${L.notice} months · serve by ${fmtD(noticeBy(L))}`],
          ['Rent payment', `${L.payTiming === 'Arrears' ? 'In arrears' : 'In advance'} · by the ${ordinal(L.dueDay)} ${L.payTiming === 'Arrears' ? 'of the following month' : 'of the month'}`],
          ['Rent-free period', (L.fitout || 0) + ' days · rent from ' + fmtD(rentStartOf(L))],
          ['Advance rent', +L.advanceRent ? `${inr(L.advanceRent)} · adjusted over ${L.advanceMonths || 1} month${(L.advanceMonths || 1) > 1 ? 's' : ''}` : 'None'],
          ['Escalation basis', `${L.escType === 'Simple' ? 'Simple (on base rent)' : 'Compounded'} from ${L.escFrom === 'Rent commencement' ? 'rent commencement' : 'lease start'}`],
        ]} />
        <Facts items={[
          ['Maintenance', `${L.maintType}${L.maint ? ' · ' + inr(L.maint) + '/mo' : ''}`],
          ['Electricity', L.elec],
          ['GST on rent', GST_TXT[L.gstMode]],
          ['TDS on rent', L.tds ? '10% (s.393, formerly 194-I) when rent exceeds ₹50,000/month' : 'Not deducted'],
          ['Registration', L.registered ? 'Registered' : 'Unregistered'],
          ['Stamp duty', L.stamp ? inr(L.stamp) : '—'],
        ]} />
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Key clauses</div><div style={{ maxWidth: '75ch' }}>{L.clauses || '—'}</div></div>
        <SchedulePanel L={L} />
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Joint inspections</div><div className="actions">{hasInspBtn ? <InspectionActions L={L} /> : <span className="small muted">None yet</span>}</div></div>
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Signed agreement &amp; annexures</div>{(L.docs || []).length ? <FileLinks files={L.docs} /> : <span className="muted small">No documents uploaded.</span>}</div>
      </Box>
    </Panel>
  )
}
