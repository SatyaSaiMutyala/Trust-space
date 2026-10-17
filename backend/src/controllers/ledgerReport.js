/*
 * Ledgers, rent roll and rent status, computed on the server with shared/calc:
 *   GET /api/ledgers?tab=Rent|Electricity|Maintenance|Other&propertyId=&ownerId=&fy=all|26-27
 *       running ledger (entries, opening/closing balance, totals), reconciliation rows (Rent/Maintenance), deposit rows (Other)
 *   GET /api/ledgers.csv?tab=&propertyId=&ownerId=       the ledger as a spreadsheet (all years, running balance)
 *   GET /api/rent-roll?months=7                         rent-roll cells for every running lease the user may see
 *   GET /api/rent-status                                 rent status chip (Overdue / Due / Up to date…) per property
 * Owners always get their own rows only; TrustLab and franchise partners see their workspace.
 */
import { badRequest } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { reportContext } from './reportContext.js'
import { schedule, rentCell, rentStatusOf, ledgerEntries, openingEntries, depAdjEntries, invState, leaseState, leaseOwners, isMulti, splitAmt, depAdjs, depHeld, rentFor, ownerShare, fy as fyOf, perAdd, perLabel, fmtD, inr, toCsv } from '../../../shared/calc/index.js'

const TABS = ['Rent', 'Electricity', 'Maintenance', 'Other']
const ledTypes = t => (t === 'Other' ? ['Water', 'Other'] : [t])
const fyStart = f => '20' + f.slice(0, 2) + '-04-01'
const fyNext = f => String(+f.slice(0, 2) + 1).padStart(2, '0') + '-'

/** Properties and leases the ledger covers: the selected property, or all in scope. */
function ledgerScope(R, q) {
  const pid = (q.propertyId || '').trim()
  const props = pid ? R.props.filter(p => p.id === pid) : R.props
  if (pid && !props.length) throw badRequest(`No property “${pid}” in your premises.`, { propertyId: 'Not found' })
  const pids = new Set(props.map(p => p.id))
  const leases = R.leases.filter(l => pids.has(l.propertyId) && l.status !== 'Draft')
  const ownerId = R.me || (q.ownerId || '').trim() || null
  const all = R.invoices.filter(i => pids.has(i.propertyId) && i.status !== 'Rejected' && (!ownerId || i.ownerId === ownerId))
  return { pids, leases, ownerId, all }
}

/** Every ledger line of a tab: invoices, opening balances and (rent) deposit adjustments, oldest first. */
function entriesOf(R, tab, leases, all, ownerId) {
  const types = ledTypes(tab); const tabInv = all.filter(i => types.includes(i.type))
  return ledgerEntries(tabInv, R.ctx).concat(openingEntries(leases, types, ownerId, R.ctx), tab === 'Rent' ? depAdjEntries(leases, ownerId, R.ctx) : []).sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
}

/** Agreement-vs-invoice rows for Rent or Maintenance (prototype reconTable), newest month first. */
function reconRows(R, leases, type, from, to, ownerId) {
  const CUR = R.today.slice(0, 7); const rows = []
  leases.forEach(L => {
    const first = R.invoices.filter(i => i.leaseId === L.id && i.type === type).map(i => i.period).sort()[0] || CUR
    schedule(L, R.ctx).rows.forEach(r => {
      if (r.p > CUR || r.p < first) return; if (from !== '0000' && r.p < from.slice(0, 7)) return; if (to !== '9999' && r.p >= to.slice(0, 7)) return
      r.split.forEach(x => {
        if (ownerId && x.ownerId !== ownerId) return; const amt = type === 'Rent' ? x.rent - x.adj : x.maint; if (!amt) return
        const inv = R.invoices.find(i => i.leaseId === L.id && i.type === type && i.period === r.p && i.status !== 'Rejected' && (i.ownerId || L.ownerId) === x.ownerId)
        rows.push({ leaseId: L.id, propertyId: L.propertyId, period: r.p, notes: r.notes, due: r.due, amt, ownerId: x.ownerId, multi: isMulti(L), inv: inv ? { id: inv.id, base: inv.base, paidDate: inv.paidDate || null, state: invState(inv, R.today) } : null, state: inv ? invState(inv, R.today) : r.due < R.today ? 'Not invoiced' : 'Upcoming' })
      })
    })
  })
  rows.sort((a, b) => b.period.localeCompare(a.period))
  return { rows, diff: rows.reduce((a, x) => a + (x.inv ? x.inv.base - x.amt : 0), 0) }
}

/** Deposits & advances rows (prototype depositTable). */
function depositRows(R, leases, ownerId) {
  const rows = []
  leases.forEach(L => {
    const sc = schedule(L, R.ctx); const x = L.exit || {}; const multi = isMulti(L); const ded = (x.deductions || []).reduce((a, dd) => a + (+dd.amount || 0), 0); const dedSplit = splitAmt(ded, leaseOwners(L), 'dep')
    ;(sc.owners || []).forEach((o, i) => {
      if (ownerId && o.ownerId !== ownerId) return; const who = multi && !R.me ? ` — ${R.ctx.ownerName(o.ownerId) || ''} (${Math.round((+o.share.dep || 0) * 100) / 100}%)` : ''
      if (o.deposit) rows.push({ d: L.start, propertyId: L.propertyId, t: 'Security deposit received from TrustLab' + who, a: o.deposit, s: L.depositPaid ? 'Received' : 'Pending', n: 'Refundable at the end of the lease' })
      depAdjs(L, o.ownerId, true).forEach(a => rows.push({ d: a.period + '-01', propertyId: L.propertyId, t: `Security deposit adjusted against rent for ${perLabel(a.period)}` + who, a: -(+a.amount || 0), s: a.status === 'Agreed' ? 'Adjusted' : 'Proposed', n: a.status === 'Agreed' ? `Agreed ${fmtD(a.consent?.on)}${a.consent?.ref ? ' · ' + a.consent.ref : ''}` : 'Awaiting owner’s agreement' }))
      if (depAdjs(L, o.ownerId).length) rows.push({ d: R.today, propertyId: L.propertyId, t: 'Security deposit still held' + who, a: depHeld(L, o.ownerId), s: 'Held', n: 'After rent adjustments' })
      if (o.adv) rows.push({ d: L.start, propertyId: L.propertyId, t: 'Advance rent received' + who, a: o.adv, s: 'Received', n: `Adjusted against rent over ${L.advanceMonths || 1} month(s) · ${inr(o.adj)} adjusted in the schedule` })
      if (x.stage >= 4) { const rf = (x.refunds || []).find(rr => rr.ownerId === o.ownerId); rows.push({ d: (rf && rf.date) || x.refundDate || x.effective, propertyId: L.propertyId, t: 'Deposit refund to TrustLab' + who, a: -(rf ? rf.amount : multi ? depHeld(L, o.ownerId) - dedSplit[i] : (x.refundReceived || x.refund || 0)), s: x.stage >= 5 ? 'Refunded' : 'Agreed', n: dedSplit[i] ? 'After deductions of ' + inr(dedSplit[i]) : 'No deductions' }) }
    })
  })
  return rows
}

export async function ledger(req, res) {
  const R = await reportContext(req.user); const q = req.query
  const tab = TABS.includes(q.tab) ? q.tab : 'Rent'
  const { leases, ownerId, all } = ledgerScope(R, q)
  const fys = [...new Set(all.map(i => fyOf(i.date)).concat(fyOf(R.today)))].sort().reverse()
  const f = q.fy && q.fy !== 'all' ? q.fy : 'all'
  if (f !== 'all' && !/^\d{2}-\d{2}$/.test(f)) throw badRequest('Financial year should look like 26-27, or "all".', { fy: 'Bad format' })
  const from = f === 'all' ? '0000' : fyStart(f), to = f === 'all' ? '9999' : fyStart(fyNext(f))
  const ent = entriesOf(R, tab, leases, all, ownerId)
  const opening = ent.filter(x => x.d < from).reduce((a, x) => a + x.dr - x.cr, 0)
  const rows = ent.filter(x => x.d >= from && x.d < to)
  const dr = rows.reduce((a, x) => a + x.dr, 0), cr = rows.reduce((a, x) => a + x.cr, 0), tds = rows.filter(x => x.part.startsWith('TDS')).reduce((a, x) => a + x.cr, 0)
  const closing = opening + dr - cr
  const data = { tab, fy: f, from: f === 'all' ? null : from, fys, opening, rows, totals: { dr, cr, tds, invoices: rows.filter(x => x.dr).length, closing }, ownerId }
  if (tab === 'Rent' || tab === 'Maintenance') data.recon = reconRows(R, leases, tab, from, to, ownerId)
  if (tab === 'Other') data.deposits = depositRows(R, leases, ownerId)
  return ok(res, `${tab} ledger: ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}, closing balance ${inr(closing)}.`, data)
}

export async function ledgerCsv(req, res) {
  const R = await reportContext(req.user); const q = req.query
  const tab = TABS.includes(q.tab) ? q.tab : 'Rent'
  const { leases, ownerId, all } = ledgerScope(R, q)
  const ent = entriesOf(R, tab, leases, all, ownerId); let bal = 0
  const csv = toCsv([['Date', 'Particulars', 'Details', 'Invoiced (Dr)', 'Paid / TDS (Cr)', 'Balance']].concat(ent.map(x => { bal += x.dr - x.cr; return [x.d, x.part, x.sub, x.dr || '', x.cr || '', bal] })))
  res.type('text/csv').attachment(`TruSpace-${tab.toLowerCase()}-ledger-${R.today}.csv`).send(csv)
}

export async function rentRoll(req, res) {
  const R = await reportContext(req.user); const CUR = R.today.slice(0, 7)
  const months = Math.min(24, Math.max(2, Number(req.query.months) || 7))
  const periods = []; for (let k = -(months - 2); k <= 1; k++) periods.push(perAdd(CUR, k))
  const leases = R.leases.filter(l => l.status !== 'Draft').map(L => {
    const cells = {}
    periods.forEach(p => { const c = rentCell(L, p, R.ctx); cells[p] = { k: c.k, n: c.n ?? 0, paid: c.paid ?? 0, multi: !!c.multi, out: c.out ?? 0, amt: c.amt ?? 0, adjusted: c.adjusted ?? 0, inv: c.inv?.id || null } })
    return { leaseId: L.id, propertyId: L.propertyId, state: leaseState(L, R.today), rentNow: Math.round(rentFor(L, CUR) * (R.me ? ownerShare(L, R.me, 'rent') : 1)), cells }
  })
  return ok(res, `Rent roll for ${leases.length} lease${leases.length === 1 ? '' : 's'}, ${perLabel(periods[0])} – ${perLabel(periods[periods.length - 1])}.`, { cur: CUR, periods, leases })
}

export async function rentStatus(req, res) {
  const R = await reportContext(req.user)
  const byProperty = {}
  R.props.forEach(P => { const L = R.leases.filter(l => l.propertyId === P.id).sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0))[0]; byProperty[P.id] = rentStatusOf(L, R.ctx) })
  return ok(res, `Rent status for ${R.props.length} propert${R.props.length === 1 ? 'y' : 'ies'}.`, { today: R.today, byProperty })
}
