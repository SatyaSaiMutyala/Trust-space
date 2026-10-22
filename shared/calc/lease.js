/*
 * Lease maths — rent schedule, escalation, co-owner splits, GST/TDS, deposit adjustments, opening balances, rent roll
 * and ledger lines. Pure: every function takes its data as arguments; the context `ctx` carries what used to be read
 * from the browser store. Ported from the TruSpace prototype; the web app wraps these with its store (web/src/domain/lease.js)
 * and the API can call them directly.
 *
 * ctx = {
 *   today:     'YYYY-MM-DD'             — the date to judge "overdue", "expired", next escalation… against
 *   invoices:  [...]                    — invoices the caller may see
 *   me:        ownerId | null           — when an owner is looking (their rows only), else null
 *   ownerView: boolean                  — owner portal (hides other owners' names in labels)
 *   ownerOf:   id => owner | undefined  — owner record (PAN, certificate, name…)
 *   ownerName: id => string | undefined — display name (may be a narrower lookup than ownerOf)
 *   propOf:    id => property | undefined
 * }
 * makeCtx() fills defaults so a bare { today } works.
 */
import { addMonths, addDays, daysFrom, dayCount, perAdd, perDiff, perLabel, fmtD, inr, toCsv } from './util.js'

export function makeCtx(c = {}) {
  const owners = c.owners || [], props = c.props || []
  const ownerOf = c.ownerOf || (id => owners.find(o => o.id === id))
  return { today: c.today || new Date().toISOString().slice(0, 10), invoices: c.invoices || [], me: c.me ?? null, ownerView: !!c.ownerView, ownerOf, ownerName: c.ownerName || (id => ownerOf(id)?.name), propOf: c.propOf || (id => props.find(p => p.id === id)) }
}
const cur = ctx => ctx.today.slice(0, 7)

/* ---------- rent and escalation ---------- */
export const rentStartOf = L => addDays(L.start, +L.fitout || 0)
export const escAnchor = L => L.escFrom === 'Rent commencement' ? rentStartOf(L) : L.start
/* Escalation applies from the start of the month in which each anniversary falls, so a lease year (e.g. Oct–Sep) has one rate. */
/* Escalation: every `escEvery` months the rent goes up by `escPct` % (escType Compound = on the last rent, Simple = on
   the base) or, with escType 'Amount', by a fixed `escAdd` rupees. */
/* escType: Compound (% on the last rent) | Simple (% of the base) | Amount (fixed ₹ each time) | StepUp — the rent stays
   at the base until escalation no. `stepAt`, where the base is revised (stepKind 'amt' = + ₹stepValue, 'pct' = + stepValue %,
   'new' = ₹stepValue); from then on escPct % applies every period, on the last rent (stepOn 'compound') or of the revised base ('simple'). */
export const escOn = L => !!(L && +L.escEvery > 0 && (L.escType === 'Amount' ? +L.escAdd > 0 : L.escType === 'StepUp' ? (+L.stepValue > 0 || +L.escPct > 0) : +L.escPct > 0))
const stepUpBase = (L, base) => (L.stepKind === 'pct' ? base * (1 + (+L.stepValue || 0) / 100) : L.stepKind === 'new' ? (+L.stepValue || base) : base + (+L.stepValue || 0))
/** What the step-up does to the base, in words: "+₹3,000", "+10%", "₹23,000". */
export const stepUpLabel = L => (L.stepKind === 'pct' ? `+${+L.stepValue || 0}%` : L.stepKind === 'new' ? inr(L.stepValue) : `+${inr(L.stepValue)}`)
/** "5% every 12 months" / "₹3,000 every 12 months" / "" when there is none. */
export const escLabel = L => [escOn(L) ? (L.escType === 'StepUp' ? `base revised at escalation ${Math.max(1, +L.stepAt || 1)} (${stepUpLabel(L)}), then ${+L.escPct || 0}% every ${+L.escEvery} months` : `${L.escType === 'Amount' ? inr(L.escAdd) : `${+L.escPct}%`} every ${+L.escEvery} months`) : '', hasRentSteps(L) ? `${explicitSteps(L).length} change${explicitSteps(L).length === 1 ? '' : 's'} as per the agreement` : ''].filter(Boolean).join(' · ')
const escStepsFrom = (L, anchor, dateStr) => { if (!escOn(L)) return 0; const a = anchor.slice(0, 7) + '-01'; let n = 0; while (n < 200 && addMonths(a, L.escEvery * (n + 1)) <= dateStr) n++; return n }
/** Rent after n escalations on `base`. `post` = the base is already a revised one (after a rent change or extension),
 *  so a step-up lease just applies its "thereafter" % from there. */
const applyEsc = (L, base, n, post) => {
  const p = (+L.escPct || 0) / 100
  if (L.escType === 'Amount') return Math.round(base + n * (+L.escAdd || 0))
  if (L.escType === 'Simple') return Math.round(base * (1 + n * p))
  if (L.escType === 'StepUp') {
    let revised = base, k = n
    if (!post) { const s = Math.max(1, Math.round(+L.stepAt || 1)); if (n < s) return Math.round(base); revised = Math.round(stepUpBase(L, base)); k = n - s }
    return Math.round(L.stepOn === 'simple' ? revised * (1 + k * p) : revised * Math.pow(1 + p, k))
  }
  return Math.round(base * Math.pow(1 + p, n))
}
export function escSteps(L, dateStr) { return escStepsFrom(L, escAnchor(L), dateStr) }
export function escAmt(L, base, dateStr) { return applyEsc(L, +base || 0, escSteps(L, dateStr)) }
/* Extensions: `L.extensions` = [{ id, at, by, fromEnd, toEnd, rent, rentFrom, ref, file }]. One with a revised `rent` is a
   rent step: from `rentFrom` (the day after the old end) the rent is that figure, and escalations count from there. */
export const rentSteps = L => (L && Array.isArray(L.extensions) ? L.extensions.filter(e => e && e.rentFrom && +e.rent > 0).slice().sort((a, b) => a.rentFrom.localeCompare(b.rentFrom)) : [])
/* Rent changes as written in the agreement (irregular patterns: 10% after 3 years, then 15% each year…):
   `L.rentSteps` = [{ id, from: 'YYYY-MM-DD', kind: 'pct' | 'amt' | 'rent', value, every?, until? }]. The regular
   escalation rule stays on: a change replaces the rule on its date (applied on the rent in force just before it) and the
   rule's clock restarts from that date. A change with `every` (months) repeats until `until` (or the lease end), and the
   rule is off inside that window; after it the rule takes over again from the last rent. Extensions' revised rents work
   the same way. With the rule off (escEvery 0) the table alone applies. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const explicitSteps = L => (L && Array.isArray(L.rentSteps) ? L.rentSteps.filter(s => s && DATE_RE.test(s.from || '') && +s.value > 0).slice().sort((a, b) => a.from.localeCompare(b.from)) : [])
export const hasRentSteps = L => explicitSteps(L).length > 0
/** Every rent change in date order with the rent just before it and the rent it leads to: the agreement's steps and
 *  extensions' revised rents, with the regular rule running in between. */
export function resolvedRentSteps(L) {
  const own = explicitSteps(L).map(s => ({ id: s.id, from: s.from, kind: ['pct', 'amt', 'rent'].includes(s.kind) ? s.kind : 'rent', value: +s.value, every: s.kind !== 'rent' && +s.every > 0 ? Math.round(+s.every) : 0, until: DATE_RE.test(s.until || '') ? s.until : '' }))
  const ext = rentSteps(L).map(e => ({ id: e.id, from: e.rentFrom, kind: 'rent', value: +e.rent, extension: true }))
  const endOf = [L.end, ...rentSteps(L).map(e => e.toEnd)].filter(Boolean).sort().pop() || ''
  // a repeating change: one entry per occurrence, up to its `until`, the next change, or the end of the lease
  const expanded = own.flatMap((s, i) => {
    if (!s.every) return [s]
    const stop = [s.until, own[i + 1]?.from && addDays(own[i + 1].from, -1), ...ext.map(e => e.from).filter(d => d > s.from).map(d => addDays(d, -1))].filter(Boolean).sort()[0] || endOf
    const out = []; let d = s.from, n = 0
    while (d && (!stop || d <= stop) && n < 400) { out.push({ ...s, id: n ? `${s.id}@${n}` : s.id, from: d, repeat: n > 0, stop }); n++; d = addMonths(s.from, s.every * n) }
    return out
  })
  const all = [...expanded, ...ext].sort((a, b) => a.from.localeCompare(b.from))
  let base = +L.rent || 0, anchor = escAnchor(L), window = '', post = false // window = last date the rule is paused for a repeating change
  return all.map(s => {
    const paused = window && s.from <= window
    const before = paused ? base : applyEsc(L, base, escStepsFrom(L, anchor, addDays(s.from, -1)), post) // the rule, up to the day before the change (not inside a repeat window)
    post = true
    const rent = s.kind === 'pct' ? Math.round(before * (1 + s.value / 100)) : s.kind === 'amt' ? Math.round(before + s.value) : Math.round(s.value)
    base = rent; anchor = s.from; window = s.every ? s.stop : ''
    return { ...s, before, rent, pauseUntil: s.every ? s.stop : '' }
  })
}
/** The base rent in force on a date and the date its escalations count from (the last change on or before it, else the lease's). */
export function rentBaseAt(L, dateStr) { const s = resolvedRentSteps(L).filter(x => x.from <= dateStr).pop(); return s ? { base: s.rent, anchor: s.from, step: s } : { base: +L.rent || 0, anchor: escAnchor(L), step: null } }
/** Monthly rent on a date: the base in force then, escalated by the rule from the last change (not inside a repeating change's window). */
export function rentAt(L, dateStr) { const { base, anchor, step } = rentBaseAt(L, dateStr); if (step && step.pauseUntil && dateStr <= step.pauseUntil) return base; return applyEsc(L, base, escStepsFrom(L, anchor, dateStr), !!step) }
export function rentFor(L, period) { if (!L) return 0; const d = period + '-01'; return rentAt(L, d < L.start ? L.start : d) }
/** The next date the rent changes after today: an escalation, or an extension's revised rent, whichever is first. */
export function nextEsc(L, today) {
  const step = resolvedRentSteps(L).find(s => s.from > today)
  let esc = null
  const cur = rentBaseAt(L, today)
  if (escOn(L) && !(cur.step && cur.step.pauseUntil && today <= cur.step.pauseUntil)) { const a = cur.anchor.slice(0, 7) + '-01'; let n = 1; while (n < 200 && addMonths(a, L.escEvery * n) <= today) n++; esc = addMonths(a, L.escEvery * n) }
  const d = step && (!esc || step.from < esc) ? step.from : esc
  return d && d <= L.end ? d : null
}

/* ---------- co-owners: each with a % share of rent, maintenance, deposit and advance, and their own GST status ---------- */
/* `L.owners` is the split in force now. When a co-owner is deactivated, added or reactivated, the split that applied
   until then is kept in `L.ownerHistory` = [{ until: 'YYYY-MM', owners: [...] }] (the last month it applied), so every
   earlier month keeps its own split. `L.ownerChanges` is the log of those changes. */
const curOwners = L => (L && Array.isArray(L.owners) && L.owners.length ? L.owners : L ? [{ ownerId: L.ownerId, rent: 100, maint: 100, dep: 100, adv: 100, gst: '' }] : [])
const history = L => (L && Array.isArray(L.ownerHistory) ? L.ownerHistory.filter(h => h && h.until && Array.isArray(h.owners) && h.owners.length).slice().sort((a, b) => a.until.localeCompare(b.until)) : [])
/** Owners with their % shares — the current split, or the split in force in month p ('YYYY-MM') when given. */
export function leaseOwners(L, p) { if (p) { const h = history(L).find(x => x.until >= p); if (h) return h.owners } return curOwners(L) }
/* A co-share (`role: 'coShare'` on the split row, from an owner record with party 'Co-share') is paid their share of the
   rent and maintenance with TDS on their own PAN, but is not party to the agreement: no invoice (a payment voucher is
   generated instead), no GST, and by default no share of the deposit or advance. */
export const isCoShare = o => !!o && o.role === 'coShare'
/** The owners who signed the agreement (the split without co-shares). */
export const leaseParties = (L, p) => leaseOwners(L, p).filter(o => !isCoShare(o))
/** The co-shares paid from the rent but not on the agreement. */
export const leaseCoShares = (L, p) => leaseOwners(L, p).filter(isCoShare)
/** The owners who received the security deposit and advance rent: the split at the start of the lease. */
export const depositOwners = L => leaseOwners(L, L && L.start ? L.start.slice(0, 7) : undefined)
export const isMulti = L => curOwners(L).length > 1 || history(L).some(h => h.owners.length > 1)
export const ownerShare = (L, ownerId, k, p) => { const o = leaseOwners(L, p).find(x => x.ownerId === ownerId); return o ? (+o[k] || 0) / 100 : 0 }
export const ownerGstMode = (L, ownerId, p) => { if (!L || L.gstMode === 'None') return 'None'; const o = leaseOwners(L, p).find(x => x.ownerId === ownerId); if (isCoShare(o)) return 'None'; return (o && o.gst) || L.gstMode || 'None' }
/** Everyone who has ever been an owner on the lease, in order of first appearance:
    [{ ownerId, active, share (current, or the last one they had), since: 'YYYY-MM', until: 'YYYY-MM' | null }] */
export function allLeaseOwners(L) {
  const hs = history(L); const startP = L && L.start ? L.start.slice(0, 7) : ''
  const splits = hs.map((h, i) => ({ from: i ? perAdd(hs[i - 1].until, 1) : startP, until: h.until, owners: h.owners })).concat([{ from: hs.length ? perAdd(hs[hs.length - 1].until, 1) : startP, until: null, owners: curOwners(L) }])
  const out = []
  splits.forEach(sp => sp.owners.forEach(o => {
    let x = out.find(y => y.ownerId === o.ownerId)
    if (!x) { x = { ownerId: o.ownerId, role: isCoShare(o) ? 'coShare' : 'owner', active: false, share: o, since: sp.from, until: null }; out.push(x) }
    x.share = o; x.until = sp.until; x.active = sp.until === null
  }))
  return out
}
export const tdsPerOwner = L => isMulti(L) && L.tdsPerOwner !== false
/** Split a total by % shares in whole rupees; the last owner with a share absorbs the rounding so the parts add up exactly. */
export function splitAmt(total, owners, k) { const parts = owners.map(o => Math.round(total * (+o[k] || 0) / 100)); const last = owners.map((o, i) => +o[k] > 0 ? i : -1).filter(i => i >= 0).pop(); if (last !== undefined) parts[last] += total - parts.reduce((a, b) => a + b, 0); return parts }

/* ---------- security deposit adjusted against rent (owner-agreed) ---------- */
export const depAdjs = (L, ownerId, all) => ((L && L.depAdj) || []).filter(a => (all ? a.status !== 'Declined' && a.status !== 'Cancelled' : a.status === 'Agreed') && (!ownerId || a.ownerId === ownerId))
export const adjFor = (L, period, ownerId) => depAdjs(L).find(a => a.period === period && a.ownerId === ownerId)
export const depShareAmt = (L, ownerId) => { const os = depositOwners(L); const i = os.findIndex(o => o.ownerId === ownerId); return i < 0 ? 0 : splitAmt(+L.deposit || 0, os, 'dep')[i] }
export const depAdjusted = (L, ownerId, all) => depAdjs(L, ownerId, all).reduce((a, x) => a + (+x.amount || 0), 0)
export const depHeld = (L, ownerId) => ownerId ? depShareAmt(L, ownerId) - depAdjusted(L, ownerId) : (+L.deposit || 0) - depAdjusted(L)

/* ---------- TDS rate per owner: 10% on rent for buildings; a valid lower/nil certificate overrides; no PAN or inoperative PAN → 20% ---------- */
export const TDS_BASE = 10, TDS_NOPAN = 20
export const panValid = O => !!(O && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(O.pan || '') && O.panStatus !== 'Inoperative')
export function certFor(O, date) { const c = O && O.tdsCert; return c && c.rate !== undefined && c.rate !== '' && c.from && c.to && date >= c.from && date <= c.to ? c : null }
/** Rate for an owner record on a date. */
export function tdsRateOf(O, date) { if (!O) return TDS_BASE; if (!panValid(O)) return TDS_NOPAN; const c = certFor(O, date); return c ? +c.rate : TDS_BASE }
export const tdsRate = (ownerId, date, ctx) => tdsRateOf(ctx.ownerOf(ownerId), date || ctx.today)
const tdsKey = (L, ctx) => allLeaseOwners(L).map(o => { const O = ctx.ownerOf(o.ownerId); return O ? [O.pan, O.panStatus, O.tdsCert] : null })

/* ---------- opening balances: dues to owners outstanding when TruSpace went live (as on 01 Apr 2026), per lease and month ---------- */
export const OB_DATE = '2026-04-01'
export const obItems = (L, types, ownerId) => ((L.opening || {}).items || []).filter(it => (!types || types.includes(it.type)) && (!ownerId || it.ownerId === ownerId))
export const obOut = it => Math.max(0, (+it.amount || 0) - (+it.paidAmount || 0) - (+it.tds || 0))
export function obOutstanding(leases, types, ownerId) { return leases.reduce((a, L) => a + obItems(L, types, ownerId).reduce((b, it) => b + obOut(it), 0), 0) }
export function openingEntries(leases, types, ownerId, ctx) {
  const e = []
  leases.forEach(L => obItems(L, types, ownerId).forEach(it => {
    const who = isMulti(L) && !ctx.ownerView ? ctx.ownerName(it.ownerId) + ' · ' : ''
    e.push({ d: addDays((L.opening.asOf || OB_DATE), -1), o: -1, part: `${it.type} due for ${perLabel(it.period)} — opening balance`, sub: `${who}${ctx.propOf(L.propertyId)?.code || ''}${it.note ? ' · ' + it.note : ''}`, dr: +it.amount || 0, cr: 0, ob: { lease: L.id, item: it.id } })
    if (+it.paidAmount) e.push({ d: it.paidOn || OB_DATE, o: 1, part: 'Payment received — opening balance', sub: `${who}${perLabel(it.period)} ${it.type.toLowerCase()} · UTR ${it.utr || '—'}`, dr: 0, cr: +it.paidAmount, ob: { lease: L.id, item: it.id } })
    if (+it.tds) e.push({ d: it.paidOn || OB_DATE, o: 2, part: 'TDS deducted by TrustLab — opening balance', sub: `${who}${perLabel(it.period)} ${it.type.toLowerCase()}`, dr: 0, cr: +it.tds, ob: { lease: L.id, item: it.id } })
  }))
  return e
}

/* ---------- the schedule ---------- */
const SCHED = new Map()
export const clearSchedCache = id => (id === undefined ? SCHED.clear() : SCHED.delete(id))
/* Month-by-month rent for the whole term: pro-rata first/last month, rent-free period, escalation, advance-rent adjustment, maintenance, GST/RCM, TDS and due dates (advance or arrears). */
export function schedule(L, ctx) {
  const end = L.exit?.effective && L.exit.effective < L.end ? L.exit.effective : L.end
  const key = JSON.stringify([L.start, end, L.rent, L.rentSteps || null, L.escPct, L.escAdd, L.stepKind, L.stepValue, L.stepAt, L.stepOn, L.escEvery, L.escType, L.escFrom, L.fitout, L.maint, L.maintType, L.maintEsc, L.advanceRent, L.advanceMonths, L.payTiming, L.dueDay, L.gstMode, L.tds, L.tdsOnMaint, L.extensions || null, L.owners || null, L.ownerHistory || null, L.tdsPerOwner, tdsKey(L, ctx)])
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
    const rate = rentAt(L, ch ? cS : oS)
    const rent = Math.round(rate * ch / D)
    const mRate = L.maintType === 'Fixed monthly' ? (L.maintEsc ? escAmt(L, L.maint, ch ? cS : oS) : (+L.maint || 0)) : 0
    const maint = Math.round(mRate * occ / D)
    let adj = 0; if (advLeft > 0 && rent > 0) { adj = Math.min(advLeft, advPer, rent); advLeft -= adj }
    const os = leaseOwners(L, p); const rp = splitAmt(rent, os, 'rent'), mp = splitAmt(maint, os, 'maint'), ap = splitAmt(adj, os, 'adv')
    const split = os.map((o, i) => {
      const a = Math.min(ap[i], rp[i]); const mode = ownerGstMode(L, o.ownerId, p); const rr = rp[i] - a; const tx = rr + mp[i]
      const oRate = Math.round(rate * (+o.rent || 0) / 100); const tdsOn = L.tds && (tdsPerOwner(L) ? oRate > 50000 : rate > 50000)
      const tr = tdsOn ? tdsRate(o.ownerId, p + '-01', ctx) / 100 : 0
      const g2 = mode === 'Forward' ? Math.round(tx * 0.18) : 0, rc = mode === 'RCM' ? Math.round(tx * 0.18) : 0, t = tdsOn ? Math.round((rr + (L.tdsOnMaint ? mp[i] : 0)) * tr) : 0
      return { ownerId: o.ownerId, role: isCoShare(o) ? 'coShare' : 'owner', rate: oRate, rent: rp[i], adj: a, maint: mp[i], gst: g2, rcm: rc, tds: t, net: tx + g2 - t, mode, tdsOn, tdsRate: tr * 100, rentNet: rr + (mode === 'Forward' ? Math.round(rr * 0.18) : 0) - (tdsOn ? Math.round(rr * tr) : 0) }
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
  /* Billing month and cash flow. In advance: a month's rent is billed and paid in that month, nothing is owed at month-end.
     In arrears: it becomes a liability at month-end (liab), is billed next month (billIn) and paid then (cash = previous month's net);
     the last month is paid after the term ends (tail). */
  const arr = L.payTiming === 'Arrears'
  rows.forEach((r, i) => { r.billIn = arr ? perAdd(r.p, 1) : r.p; r.liab = arr ? r.net : 0; r.cash = arr ? (i ? rows[i - 1].net : 0) : r.net; r.cashFor = arr ? (i ? rows[i - 1].p : null) : r.p })
  out.arrears = arr; out.timingSet = L.payTiming === 'Advance' || arr
  out.tail = arr && rows.length ? { p: perAdd(rows[rows.length - 1].p, 1), net: rows[rows.length - 1].net, forP: rows[rows.length - 1].p, due: rows[rows.length - 1].due } : null
  const F = ['rent', 'adj', 'maint', 'gst', 'rcm', 'tds', 'net', 'cash']
  const tot = Object.fromEntries(F.map(f => [f, rows.reduce((a, r) => a + r[f], 0)])); tot.months = rows.length
  const ys = {}; rows.forEach(r => { const y = ys[r.y] = ys[r.y] || { y: r.y, from: r.p, to: r.p, lo: Infinity, hi: 0, ...Object.fromEntries(F.map(f => [f, 0])) }; y.to = r.p; F.forEach(f => y[f] += r[f]); y.liab = r.liab; if (r.ch) { y.lo = Math.min(y.lo, r.rate); y.hi = Math.max(y.hi, r.rate) } })
  out.years = Object.values(ys); out.tot = tot
  // per-owner totals over the term: everyone who was ever an owner; deposit and advance belong to the owners at signing
  const adv = +L.advanceRent || 0; const dos = depositOwners(L)
  const dp = splitAmt(+L.deposit || 0, dos, 'dep'), avp = splitAmt(adv, dos, 'adv')
  out.owners = allLeaseOwners(L).map(ao => {
    const o = ao.share; const di = dos.findIndex(x => x.ownerId === ao.ownerId); const dep = di < 0 ? 0 : dp[di], av = di < 0 ? 0 : avp[di]
    const m = ownerGstMode(L, ao.ownerId, ao.active ? undefined : ao.until); const oRate = (+L.rent || 0) * (+o.rent || 0) / 100; const tdsOn = L.tds && (tdsPerOwner(L) ? oRate > 50000 : +L.rent > 50000)
    const sum = k => rows.reduce((a2, r) => a2 + (r.split.find(x => x.ownerId === ao.ownerId)?.[k] || 0), 0)
    return { ownerId: ao.ownerId, role: ao.role, active: ao.active, since: ao.since, until: ao.until, share: o, mode: m, tdsOn, rent: sum('rent'), adj: sum('adj'), maint: sum('maint'), gst: sum('gst'), rcm: sum('rcm'), tds: sum('tds'), net: sum('net'), deposit: dep, adv: av, advGst: m === 'Forward' ? Math.round(av * 0.18) : 0, advTds: tdsOn ? Math.round(av * tdsRate(ao.ownerId, L.start, ctx) / 100) : 0 }
  })
  out.upfront = { deposit: +L.deposit || 0, adv, advGst: out.owners.reduce((a2, x) => a2 + x.advGst, 0), advTds: out.owners.reduce((a2, x) => a2 + x.advTds, 0), brokerage: +L.brokerage || 0, stamp: +L.stamp || 0 }
  out.unadjusted = advLeft
  SCHED.set(L.id || '_', { key, v: out })
  return out
}
export const schedRow = (L, p, ctx) => schedule(L, ctx).rows.find(r => r.p === p)
/* Lock-in: the months from the start during which a party may not end the lease. `lockIn` binds the lessee (tenant);
   `lockInLessor` the owner, falling back to the lessee's on older leases that had one figure. */
export const lockInLessee = L => +L.lockIn || 0
export const lockInLessor = L => (L.lockInLessor === undefined || L.lockInLessor === null || L.lockInLessor === '' ? lockInLessee(L) : +L.lockInLessor || 0)
/** Months of lock-in binding the party that wants to leave: by = 'Owner' (lessor) or anything else (lessee). */
export const lockInOf = (L, by) => (by === 'Owner' ? lockInLessor(L) : lockInLessee(L))
/** When the lessee's lock-in ends (null if none). */
export const lockEnd = L => lockInLessee(L) ? addMonths(L.start, lockInLessee(L)) : null
/** When the lessor's lock-in ends (null if none). */
export const lockEndLessor = L => lockInLessor(L) ? addMonths(L.start, lockInLessor(L)) : null
export const lockEndOf = (L, by) => (by === 'Owner' ? lockEndLessor(L) : lockEnd(L))
/* Notice periods: the lessee (tenant) and the lessor (owner) may have to give different notice. `notice` is the
   lessee's; `noticeLessor` the owner's, falling back to the lessee's on older leases that had one figure. */
export const noticeLessee = L => +L.notice || 0
export const noticeLessor = L => (L.noticeLessor === undefined || L.noticeLessor === null || L.noticeLessor === '' ? noticeLessee(L) : +L.noticeLessor || 0)
/** Months of notice the party serving it must give: by = 'Owner' (lessor) or anything else (lessee). */
export const noticeOf = (L, by) => (by === 'Owner' ? noticeLessor(L) : noticeLessee(L))
/** Last date for the lessee to serve renewal/exit notice before the lease ends. */
export const noticeBy = L => addMonths(L.end, -noticeLessee(L))
/** Last date for the lessor to serve notice before the lease ends. */
export const noticeByLessor = L => addMonths(L.end, -noticeLessor(L))
export function leaseState(L, today) {
  if (!L) return 'No lease'
  if (L.status === 'Draft') return 'Draft'
  const x = L.exit || {}
  if (x.stage >= 5) return 'Terminated'
  if (x.noticeDate) return 'Notice period'
  if (L.end < today) return 'Expired'
  if (daysFrom(today, L.end) <= 120) return 'Renewal due'
  return 'Active'
}

/* ---------- one invoice: GST, RCM, TDS and net payable ---------- */
export function calc(L, type, base, period, gstOverride, ownerId, ctx) {
  base = +base || 0
  const oid = ownerId || L?.ownerId; const mode = L ? ownerGstMode(L, oid, period || cur(ctx)) : 'None'
  const gstOn = gstOverride !== undefined ? gstOverride : (mode === 'Forward' && type !== 'Electricity')
  const gst = gstOn ? Math.round(base * 0.18) : 0
  const rcm = (mode === 'RCM' && type !== 'Electricity') ? Math.round(base * 0.18) : 0
  const monthly = L ? rentFor(L, period || cur(ctx)) * (tdsPerOwner(L) ? ownerShare(L, oid, 'rent', period || cur(ctx)) : 1) : 0
  const tdsOn = !!(L && L.tds && (type === 'Rent' || (type === 'Maintenance' && L.tdsOnMaint)) && monthly > 50000)
  const rateT = tdsOn ? tdsRate(oid, (period || cur(ctx)) + '-01', ctx) : 0
  const tds = tdsOn ? Math.round(base * rateT / 100) : 0
  return { base, gst, rcm, tds, tdsRate: rateT, total: base + gst, net: base + gst - tds, mode, ownerId: oid }
}
export function invState(i, today) { if (i.status === 'Paid' || i.status === 'Rejected') return i.status; if (i.dueDate && i.dueDate < today) return 'Overdue'; return i.status }

/** Rent-roll cell for a lease and month: k = paid | process | late | missing | upcoming | free | na.
 *  With co-owners: n owners expected, paid of them paid, out = still owed, adjusted = owners settled from the deposit. */
export function rentCell(L, p, ctx) {
  if (L.status === 'Draft' || p < L.start.slice(0, 7) || p > L.end.slice(0, 7)) return { k: 'na' }
  if (L.exit?.effective && p > L.exit.effective.slice(0, 7)) return { k: 'na' }
  const row = schedRow(L, p, ctx); if (!row) return { k: 'na' }
  const me = ctx.me
  const exp = (row.split || []).filter(x => x.rent - x.adj > 0 && (!me || x.ownerId === me))
  const invs = ctx.invoices.filter(i => i.leaseId === L.id && i.type === 'Rent' && i.period === p && i.status !== 'Rejected' && (!me || i.ownerId === me))
  const due = row.due; const multi = exp.length > 1
  if (!invs.length && !exp.length) return { k: 'free', row }
  const paidIds = new Set(invs.filter(i => i.status === 'Paid').map(i => i.ownerId || L.ownerId))
  let adjusted = 0
  const out = exp.reduce((a, x) => { if (paidIds.has(x.ownerId)) return a; const iv = invs.find(i => (i.ownerId || L.ownerId) === x.ownerId && i.status !== 'Paid'); const adj = adjFor(L, p, x.ownerId); const due0 = iv ? iv.net : x.rentNet; const rem = Math.max(0, due0 - (adj ? +adj.amount || 0 : 0)); if (adj && rem <= 1) { paidIds.add(x.ownerId); adjusted++; return a } return a + rem }, 0)
  const amt = exp.reduce((a, x) => a + x.rentNet, 0)
  const n = Math.max(exp.length, 1), paid = exp.filter(x => paidIds.has(x.ownerId)).length || (exp.length ? 0 : invs.filter(i => i.status === 'Paid').length)
  const base = { row, due, invs, n, paid, multi, out, amt, adjusted }
  if (exp.length && paid >= n) return Object.assign(base, { k: 'paid', inv: invs[0] })
  if (!invs.length) return Object.assign(base, { k: due < ctx.today ? 'missing' : 'upcoming' })
  if (paid >= n) return Object.assign(base, { k: 'paid', inv: invs[0] })
  return Object.assign(base, { k: due < ctx.today ? 'late' : 'process', inv: invs.find(i => i.status !== 'Paid') || invs[0] })
}

/** Rent status of a lease: Overdue / Due / Rent-free / Up to date with the amounts, or — for a draft / ended lease. */
export function rentStatusOf(L, ctx) {
  if (!L || ['Draft', 'Terminated'].includes(leaseState(L, ctx.today))) return { v: '—', k: 'idle', note: L && L.status === 'Draft' ? 'Lease not signed' : '' }
  const CUR = cur(ctx); const sc = schedule(L, ctx); let od = 0, odN = 0, nextDue = null
  const first = ctx.invoices.filter(i => i.leaseId === L.id && i.type === 'Rent').map(i => i.period).sort()[0] || L.start.slice(0, 7)
  let partial = 0
  for (const r of sc.rows) {
    if (r.p > perAdd(CUR, 1)) break; if (r.p < first) continue; const c = rentCell(L, r.p, ctx)
    if (['late', 'missing'].includes(c.k)) { od += c.out; odN++; if (c.multi && c.paid) partial++ }
    else if (['process', 'upcoming'].includes(c.k) && !nextDue) nextDue = { d: c.inv ? c.inv.dueDate : r.due, amt: c.out || c.amt, p: r.p }
  }
  const obDue = obItems(L, ['Rent'], ctx.me).filter(obOut); const obAmt = obDue.reduce((a, it) => a + obOut(it), 0)
  if (odN || obAmt) { const months = odN + new Set(obDue.map(it => it.period)).size; return { v: 'Overdue', k: 'bad', note: `${inr(od + obAmt)} · ${months} month${months > 1 ? 's' : ''} unpaid${obAmt ? ` (incl. ${inr(obAmt)} brought forward from before ${fmtD(OB_DATE)})` : ''}${partial ? ' · some co-owners paid' : ''}` } }
  if (nextDue && daysFrom(ctx.today, nextDue.d) <= 10) return { v: 'Due', k: 'warn', note: `${inr(nextDue.amt)} for ${perLabel(nextDue.p)} by ${fmtD(nextDue.d)}` }
  const c0 = schedRow(L, CUR, ctx); const meS = ctx.me ? c0?.split?.find(x => x.ownerId === ctx.me) : null; if (c0 && (meS ? meS.rent - meS.adj : c0.rent - c0.adj) <= 0) return { v: 'Rent-free', k: 'idle', note: 'Rent from ' + fmtD(rentStartOf(L)) }
  return { v: 'Up to date', k: 'ok', note: nextDue ? `Next ${inr(nextDue.amt)} by ${fmtD(nextDue.d)}` : 'Nothing due' }
}

/* ---------- ledgers ---------- */
export function ledgerEntries(invs, ctx) {
  const e = []
  invs.forEach(i => {
    e.push({ d: i.date, o: 0, part: `${i.type} invoice ${i.number} · ${perLabel(i.period)}`, sub: `${ctx.propOf(i.propertyId)?.code || ''}${i.gst ? ' · incl. GST ' + inr(i.gst) : i.rcm ? ' · GST under RCM paid by TrustLab' : ''}`, dr: i.total, cr: 0, inv: i.id })
    if (i.status === 'Paid') {
      e.push({ d: i.paidDate || i.date, o: 1, part: i.paidBy === 'Deposit' ? 'Adjusted against security deposit' : 'Payment received', sub: i.paidBy === 'Deposit' ? `Agreed with owner · against ${i.number}` : `UTR ${i.utr || '—'} · against ${i.number}`, dr: 0, cr: +i.paidAmount || 0, inv: i.id })
      if (+i.tdsDeducted) e.push({ d: i.paidDate || i.date, o: 2, part: 'TDS deducted by TrustLab', sub: 'Credited to your PAN — reflects in Form 26AS / 16A', dr: 0, cr: +i.tdsDeducted, inv: i.id })
    }
  })
  return e.sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
}

/** Ledger lines for rent months settled from the deposit with no separate invoice. */
export function depAdjEntries(leases, ownerId, ctx) {
  const e = []; const CUR = cur(ctx)
  leases.forEach(L => depAdjs(L, ownerId).forEach(a => {
    if (a.period > CUR) return; if (ctx.invoices.some(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && (i.ownerId || L.ownerId) === a.ownerId && i.status !== 'Rejected')) return
    const x = schedRow(L, a.period, ctx)?.split?.find(y => y.ownerId === a.ownerId); if (!x) return; const rr = x.rent - x.adj; const who = isMulti(L) && !ctx.ownerView ? ctx.ownerName(a.ownerId) + ' · ' : ''
    e.push({ d: a.period + '-01', o: 0, part: `Rent for ${perLabel(a.period)} — as per agreement`, sub: `${who}${ctx.propOf(L.propertyId)?.code || ''} · no separate invoice`, dr: rr + (x.mode === 'Forward' ? Math.round(rr * 0.18) : 0), cr: 0 })
    e.push({ d: a.period + '-01', o: 1, part: 'Adjusted against security deposit', sub: `${who}agreed ${fmtD(a.consent?.on || a.createdAt)}${a.consent?.ref ? ' · ' + a.consent.ref : ''}`, dr: 0, cr: +a.amount || 0 })
    if (+a.tds) e.push({ d: a.period + '-01', o: 2, part: 'TDS deducted by TrustLab', sub: `${who}on rent settled from deposit`, dr: 0, cr: +a.tds })
  }))
  return e
}
/** Unpaid rent months (last 3 to next 12, or to the end of the notice period) that could be settled from the deposit. */
export function depAdjCandidates(L, ctx) {
  const CUR = cur(ctx); const sc = schedule(L, ctx); const end = sc.end.slice(0, 7); const last = L.exit?.noticeDate || end <= perAdd(CUR, 12) ? end : perAdd(CUR, 12); const out = []
  sc.rows.forEach(r => {
    if (r.p < perAdd(CUR, -3) || r.p > last) return
    r.split.forEach(x => {
      const rr = x.rent - x.adj; if (rr <= 0) return; const inv = ctx.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === r.p && (i.ownerId || L.ownerId) === x.ownerId && i.status !== 'Rejected')
      if (inv && inv.status === 'Paid') return; if (depAdjs(L, x.ownerId, true).some(a => a.period === r.p)) return
      const tds = inv ? +inv.tds || 0 : (x.tdsOn ? Math.round(rr * x.tdsRate / 100) : 0); const net = inv ? inv.net : x.rentNet; out.push({ period: r.p, ownerId: x.ownerId, amount: net, tds, gross: net + tds, inv: inv?.id })
    })
  })
  return out
}

/* ---------- CSV exports ---------- */
export function scheduleCsv(L, ctx) {
  const sc = schedule(L, ctx); const os = isMulti(L) ? sc.owners : []
  const rows = [['Month', 'Lease year', 'Days charged', 'Monthly rate', 'Rent', 'Advance adjusted', 'Maintenance', 'GST', 'GST under RCM', 'TDS', 'Net payable to owner(s)', 'Billed in', 'Due by', 'Liability at month-end', 'Paid this month', 'Paid for month', 'Note'].concat(os.flatMap(x => { const n = ctx.ownerName(x.ownerId) || x.ownerId; return [n + ' rent', n + ' TDS', n + ' net'] }))]
    .concat(sc.rows.map(r => [r.p, r.y, r.ch, r.rate, r.rent, r.adj, r.maint, r.gst, r.rcm, r.tds, r.net, r.billIn, r.due, r.liab, r.cash, r.cashFor || '', r.notes.join('; ')].concat(os.length ? r.split.flatMap(x => [x.rent - x.adj, x.tds, x.net]) : [])))
  if (sc.tail) rows.push([sc.tail.p, '', '', '', '', '', '', '', '', '', '', sc.tail.p, sc.tail.due, 0, sc.tail.net, sc.tail.forP, 'After term — last month paid in arrears'])
  rows.push(['Total', '', '', '', sc.tot.rent, sc.tot.adj, sc.tot.maint, sc.tot.gst, sc.tot.rcm, sc.tot.tds, sc.tot.net, '', '', '', sc.tot.cash + (sc.tail ? sc.tail.net : 0), '', ''])
  return toCsv(rows)
}
export function statementCsv(inv, ctx) {
  return toCsv([['Invoice', 'Date', 'Property', 'Code', 'Owner', 'Type', 'Period', 'Amount', 'GST', 'RCM GST', 'TDS', 'Net payable', 'Status', 'Paid date', 'Paid amount', 'UTR']].concat(inv.map(i => [i.number, i.date, ctx.propOf(i.propertyId)?.name, ctx.propOf(i.propertyId)?.code, ctx.ownerName(i.ownerId), i.type, i.period, i.base, i.gst, i.rcm, i.tds, i.net, invState(i, ctx.today), i.paidDate || '', i.paidAmount || '', i.utr || ''])))
}
