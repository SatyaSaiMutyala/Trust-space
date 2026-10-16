/* Lease maths, invoice tax and status rules — ported verbatim from reference/TruSpace.html ("lease maths", "ledgers"). */
import { S, ALL, inScope, prop, owner, isOwner, role } from '../store/store'
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

/* Co-owners: a lease can have several owners, each with a % share of rent, maintenance, deposit and advance, and their own GST status. */
export function leaseOwners(L) { if (L && Array.isArray(L.owners) && L.owners.length) return L.owners; return L ? [{ ownerId: L.ownerId, rent: 100, maint: 100, dep: 100, adv: 100, gst: '' }] : [] }
export const isMulti = L => leaseOwners(L).length > 1
export const ownerShare = (L, ownerId, k) => { const o = leaseOwners(L).find(x => x.ownerId === ownerId); return o ? (+o[k] || 0) / 100 : 0 }
export const ownerGstMode = (L, ownerId) => { if (!L || L.gstMode === 'None') return 'None'; const o = leaseOwners(L).find(x => x.ownerId === ownerId); return (o && o.gst) || L.gstMode || 'None' }
export const tdsPerOwner = L => isMulti(L) && L.tdsPerOwner !== false
export function splitAmt(total, owners, k) { const parts = owners.map(o => Math.round(total * (+o[k] || 0) / 100)); const last = owners.map((o, i) => +o[k] > 0 ? i : -1).filter(i => i >= 0).pop(); if (last !== undefined) parts[last] += total - parts.reduce((a, b) => a + b, 0); return parts }
export const leaseOwnerNames = L => leaseOwners(L).map(o => owner(o.ownerId)?.name || '—')
export const ownersLabel = L => { const n = leaseOwnerNames(L); return n.length > 1 ? `${n[0]} + ${n.length - 1} co-owner${n.length > 2 ? 's' : ''}` : n[0] }
export const leasesOfOwner = id => S.leases.filter(L => leaseOwners(L).some(o => o.ownerId === id))
/* Security deposit adjusted against rent (owner-agreed) */
export const depAdjs = (L, ownerId, all) => ((L && L.depAdj) || []).filter(a => (all ? a.status !== 'Declined' && a.status !== 'Cancelled' : a.status === 'Agreed') && (!ownerId || a.ownerId === ownerId))
export const adjFor = (L, period, ownerId) => depAdjs(L).find(a => a.period === period && a.ownerId === ownerId)
export const depShareAmt = (L, ownerId) => { const os = leaseOwners(L); const i = os.findIndex(o => o.ownerId === ownerId); return i < 0 ? 0 : splitAmt(+L.deposit || 0, os, 'dep')[i] }
export const depAdjusted = (L, ownerId, all) => depAdjs(L, ownerId, all).reduce((a, x) => a + (+x.amount || 0), 0)
export const depHeld = (L, ownerId) => ownerId ? depShareAmt(L, ownerId) - depAdjusted(L, ownerId) : (+L.deposit || 0) - depAdjusted(L)
/* TDS rate per owner: 10% on rent for buildings; a valid lower/nil certificate overrides; no PAN or inoperative PAN → 20%. */
export const TDS_BASE = 10, TDS_NOPAN = 20
export const panValid = O => !!(O && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(O.pan || '') && O.panStatus !== 'Inoperative')
export function certFor(O, date) { const c = O && O.tdsCert; return c && c.rate !== undefined && c.rate !== '' && c.from && c.to && date >= c.from && date <= c.to ? c : null }
export function tdsRate(ownerId, date) { const O = ALL.owners.find(o => o.id === ownerId) || owner(ownerId); if (!O) return TDS_BASE; if (!panValid(O)) return TDS_NOPAN; const c = certFor(O, date || TODAY); return c ? +c.rate : TDS_BASE }
const tdsKey = L => leaseOwners(L).map(o => { const O = ALL.owners.find(x => x.id === o.ownerId); return O ? [O.pan, O.panStatus, O.tdsCert] : null })

/* Opening balances: dues to owners outstanding when TruSpace went live (as on 01 Apr 2026), entered month by month per lease. */
export const OB_DATE = '2026-04-01'
export const obItems = (L, types, ownerId) => ((L.opening || {}).items || []).filter(it => (!types || types.includes(it.type)) && (!ownerId || it.ownerId === ownerId))
export const obOut = it => Math.max(0, (+it.amount || 0) - (+it.paidAmount || 0) - (+it.tds || 0))
export function obOutstanding(leases, types, ownerId) { return leases.reduce((a, L) => a + obItems(L, types, ownerId).reduce((b, it) => b + obOut(it), 0), 0) }
export const obMe = () => isOwner() ? role().ownerId : null
export function openingEntries(leases, types, ownerId) {
  const e = []
  leases.forEach(L => obItems(L, types, ownerId).forEach(it => {
    const who = isMulti(L) && !isOwner() ? owner(it.ownerId)?.name + ' · ' : ''
    e.push({ d: addDays((L.opening.asOf || OB_DATE), -1), o: -1, part: `${it.type} due for ${perLabel(it.period)} — opening balance`, sub: `${who}${prop(L.propertyId)?.code || ''}${it.note ? ' · ' + it.note : ''}`, dr: +it.amount || 0, cr: 0, ob: { lease: L.id, item: it.id } })
    if (+it.paidAmount) e.push({ d: it.paidOn || OB_DATE, o: 1, part: 'Payment received — opening balance', sub: `${who}${perLabel(it.period)} ${it.type.toLowerCase()} · UTR ${it.utr || '—'}`, dr: 0, cr: +it.paidAmount, ob: { lease: L.id, item: it.id } })
    if (+it.tds) e.push({ d: it.paidOn || OB_DATE, o: 2, part: 'TDS deducted by TrustLab — opening balance', sub: `${who}${perLabel(it.period)} ${it.type.toLowerCase()}`, dr: 0, cr: +it.tds, ob: { lease: L.id, item: it.id } })
  }))
  return e
}

const SCHED = new Map()
export const clearSchedCache = id => (id === undefined ? SCHED.clear() : SCHED.delete(id))
/* Month-by-month rent for the whole term: pro-rata first/last month, rent-free period, escalation, advance-rent adjustment, maintenance, GST/RCM, TDS and due dates (advance or arrears). */
export function schedule(L) {
  const end = L.exit?.effective && L.exit.effective < L.end ? L.exit.effective : L.end
  const key = JSON.stringify([L.start, end, L.rent, L.escPct, L.escEvery, L.escType, L.escFrom, L.fitout, L.maint, L.maintType, L.maintEsc, L.advanceRent, L.advanceMonths, L.payTiming, L.dueDay, L.gstMode, L.tds, L.tdsOnMaint, L.owners || null, L.tdsPerOwner, tdsKey(L)])
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
    const os = leaseOwners(L); const rp = splitAmt(rent, os, 'rent'), mp = splitAmt(maint, os, 'maint'), ap = splitAmt(adj, os, 'adv')
    const split = os.map((o, i) => {
      const a = Math.min(ap[i], rp[i]); const mode = ownerGstMode(L, o.ownerId); const rr = rp[i] - a; const tx = rr + mp[i]
      const oRate = Math.round(rate * (+o.rent || 0) / 100); const tdsOn = L.tds && (tdsPerOwner(L) ? oRate > 50000 : rate > 50000)
      const tr = tdsOn ? tdsRate(o.ownerId, p + '-01') / 100 : 0
      const g2 = mode === 'Forward' ? Math.round(tx * 0.18) : 0, rc = mode === 'RCM' ? Math.round(tx * 0.18) : 0, t = tdsOn ? Math.round((rr + (L.tdsOnMaint ? mp[i] : 0)) * tr) : 0
      return { ownerId: o.ownerId, rate: oRate, rent: rp[i], adj: a, maint: mp[i], gst: g2, rcm: rc, tds: t, net: tx + g2 - t, mode, tdsOn, tdsRate: tr * 100, rentNet: rr + (mode === 'Forward' ? Math.round(rr * 0.18) : 0) - (tdsOn ? Math.round(rr * tr) : 0) }
    })
    const adjUsed = split.reduce((a2, x) => a2 + x.adj, 0); advLeft += adj - adjUsed; adj = adjUsed
    const gst = split.reduce((a2, x) => a2 + x.gst, 0), rcm = split.reduce((a2, x) => a2 + x.rcm, 0), tds = split.reduce((a2, x) => a2 + x.tds, 0)
    const net = rent - adj + maint + gst - tds
    const due = (L.payTiming === 'Arrears' ? perAdd(p, 1) : p) + '-' + String(L.dueDay || 5).padStart(2, '0')
    const esc = prevRate !== null && ch && rate !== prevRate
    const notes = []
    if (!ch) notes.push('Rent-free'); else if (ch < D) notes.push(cS > ms && cS === rs && rs > L.start ? `Rent from ${fmtD(rs)} · ${ch}/${D} days` : `Pro-rata ${ch}/${D} days`)
    if (esc) notes.push(`Escalation → ${inr(rate)}`)
    if (adj) notes.push(`Advance adjusted ${inr(adj)}`)
    rows.push({ p, D, occ, ch, rate, rent, adj, maint, gst, rcm, tds, net, due, esc, notes, split, y: Math.floor(perDiff(L.start.slice(0, 7), p) / 12) + 1 })
    if (ch) prevRate = rate; p = perAdd(p, 1)
  }
  const F = ['rent', 'adj', 'maint', 'gst', 'rcm', 'tds', 'net']
  const tot = Object.fromEntries(F.map(f => [f, rows.reduce((a, r) => a + r[f], 0)])); tot.months = rows.length
  const ys = {}; rows.forEach(r => { const y = ys[r.y] = ys[r.y] || { y: r.y, from: r.p, to: r.p, lo: Infinity, hi: 0, ...Object.fromEntries(F.map(f => [f, 0])) }; y.to = r.p; F.forEach(f => y[f] += r[f]); if (r.ch) { y.lo = Math.min(y.lo, r.rate); y.hi = Math.max(y.hi, r.rate) } })
  out.years = Object.values(ys); out.tot = tot
  const adv = +L.advanceRent || 0; const os = leaseOwners(L)
  const dp = splitAmt(+L.deposit || 0, os, 'dep'), avp = splitAmt(adv, os, 'adv')
  out.owners = os.map((o, i) => {
    const m = ownerGstMode(L, o.ownerId); const oRate = (+L.rent || 0) * (+o.rent || 0) / 100; const tdsOn = L.tds && (tdsPerOwner(L) ? oRate > 50000 : +L.rent > 50000)
    const sum = k => rows.reduce((a2, r) => a2 + (r.split[i]?.[k] || 0), 0)
    return { ownerId: o.ownerId, share: o, mode: m, tdsOn, rent: sum('rent'), adj: sum('adj'), maint: sum('maint'), gst: sum('gst'), rcm: sum('rcm'), tds: sum('tds'), net: sum('net'), deposit: dp[i], adv: avp[i], advGst: m === 'Forward' ? Math.round(avp[i] * 0.18) : 0, advTds: tdsOn ? Math.round(avp[i] * tdsRate(o.ownerId, L.start) / 100) : 0 }
  })
  out.upfront = { deposit: +L.deposit || 0, adv, advGst: out.owners.reduce((a2, x) => a2 + x.advGst, 0), advTds: out.owners.reduce((a2, x) => a2 + x.advTds, 0), brokerage: +L.brokerage || 0, stamp: +L.stamp || 0 }
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
export function calc(L, type, base, period, gstOverride, ownerId) {
  base = +base || 0
  const oid = ownerId || L?.ownerId; const mode = L ? ownerGstMode(L, oid) : 'None'
  const gstOn = gstOverride !== undefined ? gstOverride : (mode === 'Forward' && type !== 'Electricity')
  const gst = gstOn ? Math.round(base * 0.18) : 0
  const rcm = (mode === 'RCM' && type !== 'Electricity') ? Math.round(base * 0.18) : 0
  const monthly = L ? rentFor(L, period || CUR) * (tdsPerOwner(L) ? ownerShare(L, oid, 'rent') : 1) : 0
  const tdsOn = !!(L && L.tds && (type === 'Rent' || (type === 'Maintenance' && L.tdsOnMaint)) && monthly > 50000)
  const rateT = tdsOn ? tdsRate(oid, (period || CUR) + '-01') : 0
  const tds = tdsOn ? Math.round(base * rateT / 100) : 0
  return { base, gst, rcm, tds, tdsRate: rateT, total: base + gst, net: base + gst - tds, mode, ownerId: oid }
}
export function invState(i) { if (i.status === 'Paid' || i.status === 'Rejected') return i.status; if (i.dueDate && i.dueDate < TODAY) return 'Overdue'; return i.status }
/** Rent-roll cell for a lease and month: k = paid | process | late | missing | upcoming | free | na.
 *  With co-owners: n owners expected, paid of them paid, out = still owed, adjusted = owners settled from the deposit. */
export function rentCell(L, p) {
  if (L.status === 'Draft' || p < L.start.slice(0, 7) || p > L.end.slice(0, 7)) return { k: 'na' }
  if (L.exit?.effective && p > L.exit.effective.slice(0, 7)) return { k: 'na' }
  const row = schedRow(L, p); if (!row) return { k: 'na' }
  const me = isOwner() ? role().ownerId : null
  const exp = (row.split || []).filter(x => x.rent - x.adj > 0 && (!me || x.ownerId === me))
  const invs = S.invoices.filter(i => i.leaseId === L.id && i.type === 'Rent' && i.period === p && i.status !== 'Rejected' && (!me || i.ownerId === me))
  const due = row.due; const multi = exp.length > 1
  if (!invs.length && !exp.length) return { k: 'free', row }
  const paidIds = new Set(invs.filter(i => i.status === 'Paid').map(i => i.ownerId || L.ownerId))
  let adjusted = 0
  const out = exp.reduce((a, x) => { if (paidIds.has(x.ownerId)) return a; const iv = invs.find(i => (i.ownerId || L.ownerId) === x.ownerId && i.status !== 'Paid'); const adj = adjFor(L, p, x.ownerId); const due0 = iv ? iv.net : x.rentNet; const rem = Math.max(0, due0 - (adj ? +adj.amount || 0 : 0)); if (adj && rem <= 1) { paidIds.add(x.ownerId); adjusted++; return a } return a + rem }, 0)
  const amt = exp.reduce((a, x) => a + x.rentNet, 0)
  const n = Math.max(exp.length, 1), paid = exp.filter(x => paidIds.has(x.ownerId)).length || (exp.length ? 0 : invs.filter(i => i.status === 'Paid').length)
  const base = { row, due, invs, n, paid, multi, out, amt, adjusted }
  if (exp.length && paid >= n) return Object.assign(base, { k: 'paid', inv: invs[0] })
  if (!invs.length) return Object.assign(base, { k: due < TODAY ? 'missing' : 'upcoming' })
  if (paid >= n) return Object.assign(base, { k: 'paid', inv: invs[0] })
  return Object.assign(base, { k: due < TODAY ? 'late' : 'process', inv: invs.find(i => i.status !== 'Paid') || invs[0] })
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
  let partial = 0
  for (const r of sc.rows) {
    if (r.p > perAdd(CUR, 1)) break; if (r.p < first) continue; const c = rentCell(L, r.p)
    if (['late', 'missing'].includes(c.k)) { od += c.out; odN++; if (c.multi && c.paid) partial++ }
    else if (['process', 'upcoming'].includes(c.k) && !nextDue) nextDue = { d: c.inv ? c.inv.dueDate : r.due, amt: c.out || c.amt, p: r.p }
  }
  const obDue = obItems(L, ['Rent'], obMe()).filter(obOut); const obAmt = obDue.reduce((a, it) => a + obOut(it), 0)
  if (odN || obAmt) { const months = odN + new Set(obDue.map(it => it.period)).size; return { v: 'Overdue', k: 'bad', note: `${inr(od + obAmt)} · ${months} month${months > 1 ? 's' : ''} unpaid${obAmt ? ` (incl. ${inr(obAmt)} brought forward from before ${fmtD(OB_DATE)})` : ''}${partial ? ' · some co-owners paid' : ''}` } }
  if (nextDue && daysTo(nextDue.d) <= 10) return { v: 'Due', k: 'warn', note: `${inr(nextDue.amt)} for ${perLabel(nextDue.p)} by ${fmtD(nextDue.d)}` }
  const cur = schedRow(L, CUR); const meS = isOwner() ? cur?.split?.find(x => x.ownerId === role().ownerId) : null; if (cur && (meS ? meS.rent - meS.adj : cur.rent - cur.adj) <= 0) return { v: 'Rent-free', k: 'idle', note: 'Rent from ' + fmtD(rentStartOf(L)) }
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
      e.push({ d: i.paidDate || i.date, o: 1, part: i.paidBy === 'Deposit' ? 'Adjusted against security deposit' : 'Payment received', sub: i.paidBy === 'Deposit' ? `Agreed with owner · against ${i.number}` : `UTR ${i.utr || '—'} · against ${i.number}`, dr: 0, cr: +i.paidAmount || 0, inv: i.id })
      if (+i.tdsDeducted) e.push({ d: i.paidDate || i.date, o: 2, part: 'TDS deducted by TrustLab', sub: 'Credited to your PAN — reflects in Form 26AS / 16A', dr: 0, cr: +i.tdsDeducted, inv: i.id })
    }
  })
  return e.sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
}

/** Ledger lines for rent months settled from the deposit with no separate invoice. */
export function depAdjEntries(leases, ownerId) {
  const e = []
  leases.forEach(L => depAdjs(L, ownerId).forEach(a => {
    if (a.period > CUR) return; if (S.invoices.some(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && (i.ownerId || L.ownerId) === a.ownerId && i.status !== 'Rejected')) return
    const x = schedRow(L, a.period)?.split?.find(y => y.ownerId === a.ownerId); if (!x) return; const rr = x.rent - x.adj; const who = isMulti(L) && !isOwner() ? owner(a.ownerId)?.name + ' · ' : ''
    e.push({ d: a.period + '-01', o: 0, part: `Rent for ${perLabel(a.period)} — as per agreement`, sub: `${who}${prop(L.propertyId)?.code || ''} · no separate invoice`, dr: rr + (x.mode === 'Forward' ? Math.round(rr * 0.18) : 0), cr: 0 })
    e.push({ d: a.period + '-01', o: 1, part: 'Adjusted against security deposit', sub: `${who}agreed ${fmtD(a.consent?.on || a.createdAt)}${a.consent?.ref ? ' · ' + a.consent.ref : ''}`, dr: 0, cr: +a.amount || 0 })
    if (+a.tds) e.push({ d: a.period + '-01', o: 2, part: 'TDS deducted by TrustLab', sub: `${who}on rent settled from deposit`, dr: 0, cr: +a.tds })
  }))
  return e
}
/** Unpaid rent months (last 3 to next 12, or to the end of the notice period) that could be settled from the deposit. */
export function depAdjCandidates(L) {
  const sc = schedule(L); const end = sc.end.slice(0, 7); const last = L.exit?.noticeDate || end <= perAdd(CUR, 12) ? end : perAdd(CUR, 12); const out = []
  sc.rows.forEach(r => {
    if (r.p < perAdd(CUR, -3) || r.p > last) return
    r.split.forEach(x => {
      const rr = x.rent - x.adj; if (rr <= 0) return; const inv = S.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === r.p && (i.ownerId || L.ownerId) === x.ownerId && i.status !== 'Rejected')
      if (inv && inv.status === 'Paid') return; if (depAdjs(L, x.ownerId, true).some(a => a.period === r.p)) return
      const tds = inv ? +inv.tds || 0 : (x.tdsOn ? Math.round(rr * x.tdsRate / 100) : 0); const net = inv ? inv.net : x.rentNet; out.push({ period: r.p, ownerId: x.ownerId, amount: net, tds, gross: net + tds, inv: inv?.id })
    })
  })
  return out
}

/* ---------- CSV exports ---------- */
export function scheduleCsv(L) {
  const sc = schedule(L); const os = isMulti(L) ? sc.owners : []
  const rows = [['Month', 'Lease year', 'Days charged', 'Monthly rate', 'Rent', 'Advance adjusted', 'Maintenance', 'GST', 'GST under RCM', 'TDS', 'Net payable to owner(s)', 'Due by', 'Note'].concat(os.flatMap(x => { const n = owner(x.ownerId)?.name || x.ownerId; return [n + ' rent', n + ' TDS', n + ' net'] }))]
    .concat(sc.rows.map(r => [r.p, r.y, r.ch, r.rate, r.rent, r.adj, r.maint, r.gst, r.rcm, r.tds, r.net, r.due, r.notes.join('; ')].concat(os.length ? r.split.flatMap(x => [x.rent - x.adj, x.tds, x.net]) : [])))
  rows.push(['Total', '', '', '', sc.tot.rent, sc.tot.adj, sc.tot.maint, sc.tot.gst, sc.tot.rcm, sc.tot.tds, sc.tot.net, '', ''])
  return toCsv(rows)
}
export function ledgerCsv(pid, U, scopeIds) {
  const pids = new Set(pid ? [pid] : U.prop ? [U.prop] : scopeIds)
  const ent = ledgerEntries(S.invoices.filter(i => pids.has(i.propertyId) && i.status !== 'Rejected' && ledTypes(U.tab).includes(i.type))).concat(openingEntries(S.leases.filter(L => pids.has(L.propertyId)), ledTypes(U.tab), obMe() || U.owner || null)).sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
  let bal = 0
  return toCsv([['Date', 'Particulars', 'Details', 'Invoiced (Dr)', 'Paid / TDS (Cr)', 'Balance']].concat(ent.map(x => { bal += x.dr - x.cr; return [x.d, x.part, x.sub, x.dr || '', x.cr || '', bal] })))
}
export function statementCsv(inv, owner) {
  return toCsv([['Invoice', 'Date', 'Property', 'Code', 'Owner', 'Type', 'Period', 'Amount', 'GST', 'RCM GST', 'TDS', 'Net payable', 'Status', 'Paid date', 'Paid amount', 'UTR']].concat(inv.map(i => [i.number, i.date, prop(i.propertyId)?.name, prop(i.propertyId)?.code, owner(i.ownerId)?.name, i.type, i.period, i.base, i.gst, i.rcm, i.tds, i.net, invState(i), i.paidDate || '', i.paidAmount || '', i.utr || ''])))
}

/** Lease for the property, including leases outside scope (used by franchise flows). */
export const anyLease = id => ALL.leases.find(l => l.id === id)
