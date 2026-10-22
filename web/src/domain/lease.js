/*
 * Lease maths for the web app. The calculations themselves live in shared/calc/lease.js (pure, shared with the API);
 * this module binds them to the browser store — today's date, the invoices in scope, who is looking — so every
 * screen keeps calling e.g. schedule(L) or calc(L, …) exactly as before. Status and label helpers that only make
 * sense in the UI stay here.
 */
import * as C from '@calc/lease.js'
import { S, ALL, inScope, prop, owner, isOwner, role } from '../store/store'
import { PRI } from './constants'
import { TODAY, daysTo, fmtD, by, fy, inr, nowISO } from './utils'

/** The calculation context for the signed-in user: owners by id (all loaded, then scoped), the invoices they may see, their own owner id. */
export const calcCtx = () => C.makeCtx({ today: TODAY, invoices: S.invoices, me: isOwner() ? role().ownerId : null, ownerView: isOwner(), ownerOf: id => ALL.owners.find(o => o.id === id) || owner(id), ownerName: id => owner(id)?.name, propOf: prop })

/* ---------- pure functions, re-exported unchanged ---------- */
export const { rentStartOf, escAnchor, escSteps, escAmt, escOn, escLabel, rentFor, rentAt, rentBaseAt, rentSteps, hasRentSteps, resolvedRentSteps, leaseOwners, isCoShare, leaseParties, leaseCoShares, isMulti, ownerShare, ownerGstMode, tdsPerOwner, splitAmt, depAdjs, adjFor, depAdjusted, depHeld, TDS_BASE, TDS_NOPAN, panValid, certFor, OB_DATE, obItems, obOut, clearSchedCache, lockEnd, lockEndLessor, lockEndOf, lockInLessee, lockInLessor, lockInOf, noticeBy, noticeByLessor, noticeLessee, noticeLessor, noticeOf, depositOwners, allLeaseOwners } = C

/* ---------- bound to today / the store ---------- */
export const nextEsc = L => C.nextEsc(L, TODAY)
/* Co-shares: an owner record with party 'Co-share' is paid a share of the rent (TDS on their PAN) but is not on the
   agreement — no invoice (a payment voucher instead), no GST. */
export const isCoShareOwner = O => !!O && O.party === 'Co-share'
export const meIsCoShare = () => isOwner() && isCoShareOwner(owner(role().ownerId))
/** How to call an invoice record: a co-share's is a "Rent payment" (voucher), everyone else's an "Invoice". */
export const invoiceWord = i => (i && i.voucher ? 'Rent payment' : 'Invoice')
export const tdsRate = (ownerId, date) => C.tdsRate(ownerId, date, calcCtx())
export const schedule = L => C.schedule(L, calcCtx())
export const schedRow = (L, p) => C.schedRow(L, p, calcCtx())
export const leaseState = L => C.leaseState(L, TODAY)
export const calc = (L, type, base, period, gstOverride, ownerId) => C.calc(L, type, base, period, gstOverride, ownerId, calcCtx())
export const invState = i => C.invState(i, TODAY)
export const rentCell = (L, p) => C.rentCell(L, p, calcCtx())
export const scheduleCsv = L => C.scheduleCsv(L, calcCtx())
export const statementCsv = (inv, ownerFn) => C.statementCsv(inv, { ...calcCtx(), ownerName: id => ownerFn(id)?.name })

/* ---------- store lookups ---------- */
export function leaseOf(pid) { return S.leases.filter(l => l.propertyId === pid).sort(by('start', -1))[0] }
export const leaseOwnerNames = L => leaseOwners(L).map(o => owner(o.ownerId)?.name || '—')
export const ownersLabel = L => { const n = leaseOwnerNames(L); return n.length > 1 ? `${n[0]} + ${n.length - 1} co-owner${n.length > 2 ? 's' : ''}` : n[0] }
export const leasesOfOwner = id => S.leases.filter(L => allLeaseOwners(L).some(o => o.ownerId === id))
export const obMe = () => isOwner() ? role().ownerId : null
/** Lease for the property, including leases outside scope (used by franchise flows). */
export const anyLease = id => ALL.leases.find(l => l.id === id)

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
    ev.push({ d: L.end, t: 'Lease expiry', p: P }); ev.push({ d: noticeBy(L), t: `Last date for the tenant to serve renewal/exit notice (${noticeLessee(L)} mo)`, p: P })
    if (noticeLessor(L) !== noticeLessee(L)) ev.push({ d: noticeByLessor(L), t: `Last date for the owner to serve notice (${noticeLessor(L)} mo)`, p: P })
    const le = lockEnd(L); if (le) ev.push({ d: le, t: `Lock-in ends for the tenant (${lockInLessee(L)} mo)`, p: P })
    const lo = lockEndLessor(L); if (lo && lockInLessor(L) !== lockInLessee(L)) ev.push({ d: lo, t: `Lock-in ends for the owner (${lockInLessor(L)} mo)`, p: P })
    const ne = nextEsc(L); if (ne) ev.push({ d: ne, t: `Rent changes → ${inr(rentFor(L, ne.slice(0, 7)))}${escLabel(L) ? ` (${escLabel(L)})` : ''}`, p: P })
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
/* Ledgers, rent roll and rent status are computed by the API (GET /api/ledgers, /api/rent-roll, /api/rent-status). */
