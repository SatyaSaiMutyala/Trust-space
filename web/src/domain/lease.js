/* Lease maths, invoice tax and status rules — ported verbatim from reference/TruSpace.html ("lease maths", "ledgers"). */
import { S, ALL, inScope, prop } from '../store/store'
import { PRI } from './constants'
import { TODAY, CUR, addMonths, addDays, daysTo, fmtD, perAdd, perDiff, perLabel, by, fy, dayCount, inr, nowISO, toCsv } from './utils'

export function leaseOf(pid) { return S.leases.filter(l => l.propertyId === pid).sort(by('start', -1))[0] }
export const rentStartOf = L => addDays(L.start, +L.fitout || 0)
export const escAnchor = L => L.escFrom === 'Rent commencement' ? rentStartOf(L) : L.start
/* Escalation applies from the start of the month in which each anniversary falls, so a lease year (e.g. Oct–Sep) has one rate. */
export function escSteps(L, dateStr) { if (!L.escEvery || !L.escPct) return 0; const a = escAnchor(L).slice(0, 7) + '-01'; let n = 0; while (n < 200 && addMonths(a, L.escEvery * (n + 1)) <= dateStr) n++; return n }
export function escAmt(L, base, dateStr) { const n = escSteps(L, dateStr); base = +base || 0; return Math.round(L.escType === 'Simple' ? base * (1 + n * (L.escPct || 0) / 100) : base * Math.pow(1 + (L.escPct || 0) / 100, n)) }
export function rentFor(L, period) { if (!L) return 0; const d = period + '-01'; return escAmt(L, L.rent, d < L.start ? L.start : d) }
export function nextEsc(L) { if (!L.escEvery || !L.escPct) return null; const a = escAnchor(L).slice(0, 7) + '-01'; let n = 1; while (n < 200 && addMonths(a, L.escEvery * n) <= TODAY) n++; const d = addMonths(a, L.escEvery * n); return d <= L.end ? d : null }

const SCHED = new Map()
export const clearSchedCache = id => SCHED.delete(id)
/* Month-by-month rent for the whole term: pro-rata first/last month, rent-free period, escalation, advance-rent adjustment, maintenance, GST/RCM, TDS and due dates (advance or arrears). */
export function schedule(L) {
  const end = L.exit?.effective && L.exit.effective < L.end ? L.exit.effective : L.end
  const key = JSON.stringify([L.start, end, L.rent, L.escPct, L.escEvery, L.escType, L.escFrom, L.fitout, L.maint, L.maintType, L.maintEsc, L.advanceRent, L.advanceMonths, L.payTiming, L.dueDay, L.gstMode, L.tds, L.tdsOnMaint])
  const c = SCHED.get(L.id || '_'); if (c && c.key === key) return c.v
  const rows = []; const out = { rows, years: [], tot: {}, end }
  if (!L.start || !end || end < L.start || !(+L.rent >= 0)) { return out }
  const rs = rentStartOf(L); let p = L.start.slice(0, 7); const last = end.slice(0, 7)
  let advLeft = +L.advanceRent || 0; const advPer = (+L.advanceMonths || 0) > 0 ? Math.ceil(advLeft / L.advanceMonths) : advLeft
  let prevRate = null, g = 0
  while (p <= last && g++ < 600) {
    const ms = p + '-01', me = addDays(perAdd(p, 1) + '-01', -1), D = +me.slice(8)
    const oS = L.start > ms ? L.start : ms, oE = end < me ? end : me; const occ = dayCount(oS, oE)
    const cS = rs > oS ? rs : oS; const ch = cS > oE ? 0 : dayCount(cS, oE)
    const rate = escAmt(L, L.rent, ch ? cS : oS)
    const rent = Math.round(rate * ch / D)
    const mRate = L.maintType === 'Fixed monthly' ? (L.maintEsc ? escAmt(L, L.maint, ch ? cS : oS) : (+L.maint || 0)) : 0
    const maint = Math.round(mRate * occ / D)
    let adj = 0; if (advLeft > 0 && rent > 0) { adj = Math.min(advLeft, advPer, rent); advLeft -= adj }
    const taxable = rent - adj + maint
    const gst = L.gstMode === 'Forward' ? Math.round(taxable * 0.18) : 0
    const rcm = L.gstMode === 'RCM' ? Math.round(taxable * 0.18) : 0
    const tds = L.tds && rate > 50000 ? Math.round(((rent - adj) + (L.tdsOnMaint ? maint : 0)) * 0.10) : 0
    const net = rent - adj + maint + gst - tds
    const due = (L.payTiming === 'Arrears' ? perAdd(p, 1) : p) + '-' + String(L.dueDay || 5).padStart(2, '0')
    const esc = prevRate !== null && ch && rate !== prevRate
    const notes = []
    if (!ch) notes.push('Rent-free'); else if (ch < D) notes.push(cS > ms && cS === rs && rs > L.start ? `Rent from ${fmtD(rs)} · ${ch}/${D} days` : `Pro-rata ${ch}/${D} days`)
    if (esc) notes.push(`Escalation → ${inr(rate)}`)
    if (adj) notes.push(`Advance adjusted ${inr(adj)}`)
    rows.push({ p, D, occ, ch, rate, rent, adj, maint, gst, rcm, tds, net, due, esc, notes, y: Math.floor(perDiff(L.start.slice(0, 7), p) / 12) + 1 })
    if (ch) prevRate = rate; p = perAdd(p, 1)
  }
  const F = ['rent', 'adj', 'maint', 'gst', 'rcm', 'tds', 'net']
  const tot = Object.fromEntries(F.map(f => [f, rows.reduce((a, r) => a + r[f], 0)])); tot.months = rows.length
  const ys = {}; rows.forEach(r => { const y = ys[r.y] = ys[r.y] || { y: r.y, from: r.p, to: r.p, lo: Infinity, hi: 0, ...Object.fromEntries(F.map(f => [f, 0])) }; y.to = r.p; F.forEach(f => y[f] += r[f]); if (r.ch) { y.lo = Math.min(y.lo, r.rate); y.hi = Math.max(y.hi, r.rate) } })
  out.years = Object.values(ys); out.tot = tot
  const adv = +L.advanceRent || 0
  out.upfront = { deposit: +L.deposit || 0, adv, advGst: L.gstMode === 'Forward' ? Math.round(adv * 0.18) : 0, advTds: L.tds && +L.rent > 50000 ? Math.round(adv * 0.10) : 0, brokerage: +L.brokerage || 0, stamp: +L.stamp || 0 }
  out.unadjusted = advLeft
  SCHED.set(L.id || '_', { key, v: out })
  return out
}
export const schedRow = (L, p) => schedule(L).rows.find(r => r.p === p)
export const lockEnd = L => L.lockIn ? addMonths(L.start, L.lockIn) : null
export const noticeBy = L => addMonths(L.end, -(L.notice || 0))
export function leaseState(L) {
  if (!L) return 'No lease'
  if (L.status === 'Draft') return 'Draft'
  const x = L.exit || {}
  if (x.stage >= 5) return 'Terminated'
  if (x.noticeDate) return 'Notice period'
  if (L.end < TODAY) return 'Expired'
  if (daysTo(L.end) <= 120) return 'Renewal due'
  return 'Active'
}
export function calc(L, type, base, period, gstOverride) {
  base = +base || 0
  const mode = L?.gstMode || 'None'
  const gstOn = gstOverride !== undefined ? gstOverride : (mode === 'Forward' && type !== 'Electricity')
  const gst = gstOn ? Math.round(base * 0.18) : 0
  const rcm = (mode === 'RCM' && type !== 'Electricity') ? Math.round(base * 0.18) : 0
  const monthly = L ? rentFor(L, period || CUR) : 0
  const tdsOn = !!(L && L.tds && (type === 'Rent' || (type === 'Maintenance' && L.tdsOnMaint)) && monthly > 50000)
  const tds = tdsOn ? Math.round(base * 0.10) : 0
  return { base, gst, rcm, tds, total: base + gst, net: base + gst - tds }
}
export function invState(i) { if (i.status === 'Paid' || i.status === 'Rejected') return i.status; if (i.dueDate && i.dueDate < TODAY) return 'Overdue'; return i.status }
/** Rent-roll cell for a lease and month: k = paid | process | late | missing | upcoming | free | na */
export function rentCell(L, p) {
  if (L.status === 'Draft' || p < L.start.slice(0, 7) || p > L.end.slice(0, 7)) return { k: 'na' }
  if (L.exit?.effective && p > L.exit.effective.slice(0, 7)) return { k: 'na' }
  const row = schedRow(L, p); if (!row) return { k: 'na' }
  const inv = S.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === p && i.status !== 'Rejected')
  if (!inv && row.rent - row.adj <= 0) return { k: 'free', row }
  const due = row.due
  if (inv) return inv.status === 'Paid' ? { k: 'paid', inv } : { k: due < TODAY ? 'late' : 'process', inv }
  return { k: due < TODAY ? 'missing' : 'upcoming', due }
}
export function slaDue(t) { return new Date(new Date(t.createdAt).getTime() + (PRI[t.priority]?.h || 72) * 3600e3).toISOString() }
export const slaBreached = t => !['Resolved', 'Closed'].includes(t.status) && slaDue(t) < nowISO()

/* ---------- property statuses (occupancy, rent, repairs) ---------- */
/* Front-view photo: property's own, else carried from site scouting */
export function frontOf(P) { if (P.frontPhoto) return P.frontPhoto; const st = S.sites.find(x => x.propertyId === P.id); return st?.frontPhoto || (P.photos || [])[0] || st?.photos?.[0] || null }
export function occStatus(P) {
  const L = leaseOf(P.id); const ls = leaseState(L)
  if (P.status === 'Vacated' || ls === 'Terminated') return { v: 'Terminated', k: 'idle', note: L?.exit?.handoverDate ? 'Handed over ' + fmtD(L.exit.handoverDate) : L ? 'Lease ended ' + fmtD(L.exit?.effective || L.end) : '' }
  if (P.status === 'Pipeline') return { v: 'Pipeline', k: 'info', note: L ? `Lease ${ls.toLowerCase()} · possession ${fmtD(L.start)}` : 'No lease yet' }
  if (P.status === 'Under fit-out') return { v: 'Fit-out', k: 'info', note: L ? 'Rent from ' + fmtD(rentStartOf(L)) : '' }
  const note = !L ? 'No lease recorded' : ls === 'Notice period' ? `Notice served · vacating ${fmtD(L.exit.effective)}` : ls === 'Renewal due' ? `Lease ends ${fmtD(L.end)} · renewal due` : ls === 'Expired' ? `Lease expired ${fmtD(L.end)}` : `Lease to ${fmtD(L.end)}`
  return { v: 'Active', k: 'ok', note, warn: ['Notice period', 'Renewal due', 'Expired'].includes(ls) }
}
export function rentStatus(P) {
  const L = leaseOf(P.id); if (!L || ['Draft', 'Terminated'].includes(leaseState(L))) return { v: '—', k: 'idle', note: L && L.status === 'Draft' ? 'Lease not signed' : '' }
  const sc = schedule(L); let od = 0, odN = 0, nextDue = null
  const first = S.invoices.filter(i => i.leaseId === L.id && i.type === 'Rent').map(i => i.period).sort()[0] || L.start.slice(0, 7)
  for (const r of sc.rows) {
    if (r.p > perAdd(CUR, 1)) break; if (r.p < first) continue; const c = rentCell(L, r.p)
    if (['late', 'missing'].includes(c.k)) { od += c.inv ? c.inv.net : (r.rent - r.adj) + (L.gstMode === 'Forward' ? Math.round((r.rent - r.adj) * 0.18) : 0) - (r.tds || 0); odN++ }
    else if (['process', 'upcoming'].includes(c.k) && !nextDue) nextDue = { d: c.inv ? c.inv.dueDate : r.due, amt: c.inv ? c.inv.net : (r.rent - r.adj), p: r.p }
  }
  if (odN) return { v: 'Overdue', k: 'bad', note: `${inr(od)} · ${odN} month${odN > 1 ? 's' : ''} unpaid` }
  if (nextDue && daysTo(nextDue.d) <= 10) return { v: 'Due', k: 'warn', note: `${inr(nextDue.amt)} for ${perLabel(nextDue.p)} by ${fmtD(nextDue.d)}` }
  const cur = schedRow(L, CUR); if (cur && cur.rent - cur.adj <= 0) return { v: 'Rent-free', k: 'idle', note: 'Rent from ' + fmtD(rentStartOf(L)) }
  return { v: 'Up to date', k: 'ok', note: nextDue ? `Next ${inr(nextDue.amt)} by ${fmtD(nextDue.d)}` : 'Nothing due' }
}
export function repairStatus(P) {
  const open = S.tickets.filter(t => t.propertyId === P.id && !['Resolved', 'Closed'].includes(t.status))
  if (!open.length) return { v: 'No open issues', k: 'ok', note: '' }
  const p1 = open.filter(t => t.priority === 'P1').length, br = open.filter(slaBreached).length, own = open.filter(t => t.status === 'Awaiting owner').length
  const bits = [p1 ? `${p1} critical` : '', br ? `${br} past SLA` : '', own ? `${own} awaiting owner` : ''].filter(Boolean)
  return { v: `${open.length} open`, k: p1 || br ? 'bad' : 'warn', note: bits.join(' · ') || open.map(t => t.title).slice(0, 1).join('') }
}

/** Critical-date events (lease expiry, notice-by, lock-in end, escalation, exit) within `days`, sorted. */
export function criticalEvents(days, pid) {
  const ev = []
  for (const L of S.leases) {
    if (pid && L.propertyId !== pid) continue; if (!inScope(L)) continue; const st = leaseState(L); if (['Terminated', 'Draft'].includes(st)) continue; const P = prop(L.propertyId)
    ev.push({ d: L.end, t: 'Lease expiry', p: P }); ev.push({ d: noticeBy(L), t: `Last date to serve renewal/exit notice (${L.notice} mo)`, p: P })
    const le = lockEnd(L); if (le) ev.push({ d: le, t: 'Lock-in ends', p: P })
    const ne = nextEsc(L); if (ne) ev.push({ d: ne, t: `Rent escalates ${L.escPct}% → ${inr(rentFor(L, ne.slice(0, 7)))}`, p: P })
    if (L.exit?.effective && L.exit.stage < 5) ev.push({ d: L.exit.effective, t: 'Exit effective — handover due', p: P })
  }
  return ev.filter(e => e.d && daysTo(e.d) <= days && daysTo(e.d) >= -30).sort(by('d'))
}

/* ---------- owners ---------- */
export const maskAcct = a => a ? '•••• ' + String(a).slice(-4) : '—'
export const fmtAddr = a => a ? [a.attn ? 'Attn: ' + a.attn : '', a.line, a.city, a.state, a.pin].filter(Boolean).join(', ') : ''
export const noticeAddrOf = O => O.noticeSame === false && O.noticeAddr?.line ? fmtAddr(O.noticeAddr) : (fmtAddr(O.addr) || O.address || '')
/** Bank-detail status as [label, chip kind] */
export function bankState(O) { if (!O.acctNo) return ['Bank details missing', 'bad']; if (O.bankPending) return ['Change awaiting verification', 'warn']; return O.bankVerified ? ['Verified', 'ok'] : ['Not verified', 'warn'] }

/* ---------- ledgers ---------- */
export const ledTypes = t => t === 'Other' ? ['Water', 'Other'] : [t]
export function fyStart(f) { return '20' + f.slice(0, 2) + '-04-01' }
export function fyList(invs) { const set = new Set(invs.map(i => fy(i.date))); set.add(fy(TODAY)); return [...set].sort().reverse() }
export function ledgerEntries(invs) {
  const e = []
  invs.forEach(i => {
    e.push({ d: i.date, o: 0, part: `${i.type} invoice ${i.number} · ${perLabel(i.period)}`, sub: `${prop(i.propertyId)?.code || ''}${i.gst ? ' · incl. GST ' + inr(i.gst) : i.rcm ? ' · GST under RCM paid by TrustLab' : ''}`, dr: i.total, cr: 0, inv: i.id })
    if (i.status === 'Paid') {
      e.push({ d: i.paidDate || i.date, o: 1, part: 'Payment received', sub: `UTR ${i.utr || '—'} · against ${i.number}`, dr: 0, cr: +i.paidAmount || 0, inv: i.id })
      if (+i.tdsDeducted) e.push({ d: i.paidDate || i.date, o: 2, part: 'TDS deducted by TrustLab', sub: 'Credited to your PAN — reflects in Form 26AS / 16A', dr: 0, cr: +i.tdsDeducted, inv: i.id })
    }
  })
  return e.sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
}

/* ---------- CSV exports ---------- */
export function scheduleCsv(L) {
  const sc = schedule(L)
  const rows = [['Month', 'Lease year', 'Days charged', 'Monthly rate', 'Rent', 'Advance adjusted', 'Maintenance', 'GST', 'GST under RCM', 'TDS', 'Net payable to owner', 'Due by', 'Note']].concat(sc.rows.map(r => [r.p, r.y, r.ch, r.rate, r.rent, r.adj, r.maint, r.gst, r.rcm, r.tds, r.net, r.due, r.notes.join('; ')]))
  rows.push(['Total', '', '', '', sc.tot.rent, sc.tot.adj, sc.tot.maint, sc.tot.gst, sc.tot.rcm, sc.tot.tds, sc.tot.net, '', ''])
  return toCsv(rows)
}
export function ledgerCsv(pid, U, scopeIds) {
  const pids = new Set(pid ? [pid] : U.prop ? [U.prop] : scopeIds)
  const ent = ledgerEntries(S.invoices.filter(i => pids.has(i.propertyId) && i.status !== 'Rejected' && ledTypes(U.tab).includes(i.type)))
  let bal = 0
  return toCsv([['Date', 'Particulars', 'Details', 'Invoiced (Dr)', 'Paid / TDS (Cr)', 'Balance']].concat(ent.map(x => { bal += x.dr - x.cr; return [x.d, x.part, x.sub, x.dr || '', x.cr || '', bal] })))
}
export function statementCsv(inv, owner) {
  return toCsv([['Invoice', 'Date', 'Property', 'Code', 'Owner', 'Type', 'Period', 'Amount', 'GST', 'RCM GST', 'TDS', 'Net payable', 'Status', 'Paid date', 'Paid amount', 'UTR']].concat(inv.map(i => [i.number, i.date, prop(i.propertyId)?.name, prop(i.propertyId)?.code, owner(i.ownerId)?.name, i.type, i.period, i.base, i.gst, i.rcm, i.tds, i.net, invState(i), i.paidDate || '', i.paidAmount || '', i.utr || ''])))
}

/** Lease for the property, including leases outside scope (used by franchise flows). */
export const anyLease = id => ALL.leases.find(l => l.id === id)
