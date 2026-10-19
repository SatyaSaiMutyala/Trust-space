/*
 * Screens of the mobile app that need several figures at once, served in one call so the phone makes one request:
 *   GET /api/mobile/overview        staff Home — this month's rent roll, the four tiles, "Needs you today"
 *   GET /api/mobile/notifications   the user's feed; POST …/read { ids? }, DELETE …/:id, DELETE … (clear all)
 *   GET /api/mobile/sites/:id       a site with its requirement, catchment index, checklist score and the checklist items
 * Everything is computed from the same scoped records and shared/calc maths as the web pages.
 */
import mongoose from 'mongoose'
import { models } from '../models/index.js'
import { ok } from '../utils/respond.js'
import { reportContext } from './reportContext.js'
import { leaseState, rentFor, rentCell, invState, depHeld, obOutstanding, OB_DATE, SITE_ITEMS, catchIndex, siteScore } from '../../../shared/calc/index.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { notFound } from '../utils/ApiError.js'

const SLA_HOURS = { P1: 4, P2: 24, P3: 72, P4: 168 }
const OPEN_TKT = ['Open', 'Assigned', 'In progress', 'Awaiting owner']
const PIPELINE = ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved', 'Agreement', 'Take-over']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const slaDue = t => new Date(new Date(t.createdAt).getTime() + (SLA_HOURS[t.priority] || 72) * 3600e3)
const pct = (part, whole) => (whole > 0 ? Math.round(part / whole * 100) : 0)
const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5))
/** "5 h 40 m" style distance to a time, or "over by …" when past. */
const hoursLeft = (due, now) => { const m = Math.round((due - now) / 60000); const abs = Math.abs(m); const h = Math.floor(abs / 60), mm = abs % 60; const txt = h ? `${h} h${mm ? ` ${mm} m` : ''}` : `${mm} m`; return m >= 0 ? `due in ${txt}` : `over by ${txt}` }

export async function overview(req, res) {
  const R = await reportContext(req.user)
  const CUR = R.today.slice(0, 7); const now = new Date()
  const [tickets, sites, inspections] = await Promise.all([
    models.tickets.find({ status: { $in: OPEN_TKT } }).lean(),
    models.sites.find({ stage: { $in: PIPELINE } }).lean(),
    models.inspections.find({ status: { $in: ['In progress', 'Awaiting owner sign-off'] } }).lean(),
  ])
  const propName = id => R.props.find(p => p.id === id)?.name || ''

  // Rent roll this month: every running lease, split by what the rent-roll cell says
  const active = R.leases.filter(l => ['Active', 'Renewal due', 'Notice period'].includes(leaseState(l, R.today)))
  let paid = 0, process = 0, overdue = 0, total = 0
  active.forEach(L => {
    const amt = Math.round(rentFor(L, CUR)); const c = rentCell(L, CUR, R.ctx); total += amt
    if (c.k === 'paid') paid += amt
    else if (c.k === 'process') process += amt
    else if (c.k === 'late' || c.k === 'missing') { if (c.multi) { paid += c.paid || 0; overdue += Math.max(0, amt - (c.paid || 0)) } else overdue += amt }
  })
  const sqft = R.props.filter(p => ['Active', 'Notice served', 'Under fit-out'].includes(p.status)).reduce((s, p) => s + (+p.area || 0), 0)

  // Tiles
  const pend = R.invoices.filter(i => !['Paid', 'Rejected'].includes(i.status))
  const overdueInv = pend.filter(i => invState(i, R.today) === 'Overdue')
  const openingOut = obOutstanding(R.leases.filter(L => L.status !== 'Draft' && L.start < OB_DATE), null, R.me)
  const pastSla = tickets.filter(t => slaDue(t) < now)
  const depLeases = R.leases.filter(l => l.depositPaid && leaseState(l, R.today) !== 'Terminated')
  const held = depLeases.reduce((a, l) => a + depHeld(l), 0)
  const waiting = sites.filter(s => s.stage === 'Acceptance')

  // Needs you today
  const toApprove = R.invoices.filter(i => i.status === 'Verified')
  const toVerify = R.invoices.filter(i => i.status === 'Submitted')
  const oldest = list => (list.length ? Math.max(...list.map(i => daysBetween(i.date, R.today))) : 0)
  const needs = []
  if (toApprove.length) needs.push({ key: 'approve', n: toApprove.length, tone: 'amber', title: 'Invoices to approve', sub: `₹${toApprove.reduce((a, i) => a + (+i.net || 0), 0).toLocaleString('en-IN')}, oldest ${oldest(toApprove)} days`, to: 'ToApprove' })
  if (toVerify.length) needs.push({ key: 'verify', n: toVerify.length, tone: 'blue', title: 'Invoices to verify', sub: `₹${toVerify.reduce((a, i) => a + (+i.net || 0), 0).toLocaleString('en-IN')}, oldest ${oldest(toVerify)} days`, to: 'Invoices' })
  if (pastSla.length) { const t = pastSla.sort((a, b) => slaDue(a) - slaDue(b))[0]; needs.push({ key: 'sla', n: pastSla.length, tone: 'coral', title: 'Repairs past SLA', sub: `${propName(t.propertyId)} ${t.title}`.trim(), to: 'TicketDetail', id: t._id }) }
  else if (tickets.length) { const t = tickets.sort((a, b) => slaDue(a) - slaDue(b))[0]; needs.push({ key: 'repairs', n: tickets.length, tone: 'amber', title: 'Open repairs', sub: `${propName(t.propertyId)} ${hoursLeft(slaDue(t), now)}`, to: 'TicketDetail', id: t._id }) }
  if (inspections.length) { const i = inspections[0]; needs.push({ key: 'inspect', n: inspections.length, tone: 'mist', title: 'Inspections to finish', sub: `${propName(i.propertyId)} ${i.kind || ''}`.trim(), to: 'Inspect', id: i._id }) }
  if (waiting.length) { const s = waiting[0]; needs.push({ key: 'sites', n: waiting.length, tone: 'blue', title: waiting.length === 1 ? 'Site to approve' : 'Sites to approve', sub: `${s.name || s.title || ''}${s.rentAsked ? `, ₹${(+s.rentAsked).toLocaleString('en-IN')}` : ''}`, to: 'SiteEvaluation', id: s._id }) }
  const d = new Date(R.today + 'T00:00:00')
  const data = {
    today: R.today, dateLabel: `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`,
    rentRoll: { period: CUR, month: MONTHS[d.getMonth()], amount: total, leases: active.length, sqft, paidPct: pct(paid, total), processPct: pct(process, total), overduePct: pct(overdue, total), paid, process, overdue },
    tiles: {
      payable: { amount: pend.reduce((a, i) => a + (+i.net || 0), 0) + openingOut, invoices: pend.length, overdue: overdueInv.reduce((a, i) => a + (+i.net || 0), 0), overdueCount: overdueInv.length },
      repairs: { open: tickets.length, pastSla: pastSla.length, critical: tickets.filter(t => t.priority === 'P1').length },
      deposits: { held, leases: depLeases.length },
      pipeline: { sites: sites.length, waiting: waiting.length },
    },
    needs, needsTotal: needs.reduce((a, x) => a + x.n, 0),
  }
  return ok(res, `Overview for ${data.dateLabel}: ${active.length} running lease${active.length === 1 ? '' : 's'}, ${needs.length ? needs.reduce((a, x) => a + x.n, 0) + ' things need you' : 'nothing waiting'}.`, data)
}

/* ---------- notifications: one row per thing that changed, newest first; read / dismissed state kept per user ---------- */
const stateSchema = new mongoose.Schema({ _id: String, read: { type: [String], default: [] }, dismissed: { type: [String], default: [] }, clearedAt: String }, { versionKey: false })
const NotifState = mongoose.models.MobileNotifState || mongoose.model('MobileNotifState', stateSchema)
const DAY = 864e5
const ago = (iso, now) => { const m = Math.round((now - new Date(iso)) / 60000); if (m < 1) return 'Just now'; if (m < 60) return `${m} m ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

/** Build the feed for a user from the records in their scope: approvals, verifications, past-SLA repairs, owner
 *  messages, inspections awaiting sign-off, sites waiting for approval, generated invoices. */
async function buildFeed(R) {
  const now = new Date(); const since = new Date(now - 14 * DAY).toISOString()
  const [tickets, messages, inspections, sites] = await Promise.all([
    models.tickets.find({ status: { $in: OPEN_TKT } }).lean(),
    models.messages.find({ from: 'owner', at: { $gte: since } }).lean(),
    models.inspections.find({ status: 'Awaiting owner sign-off' }).lean(),
    models.sites.find({ stage: 'Acceptance' }).lean(),
  ])
  const propName = id => R.props.find(p => p.id === id)?.name || ''
  const ownerName = id => R.owners.find(o => o.id === id)?.name || 'Owner'
  const items = []
  R.invoices.filter(i => i.status === 'Verified' && i.date >= since.slice(0, 10)).forEach(i => items.push({ id: `inv:${i.id}`, at: i.updatedAt || i.createdAt || i.date, icon: 'file-check', tone: 'amber', title: 'Invoice to approve', sub: `${ownerName(i.ownerId)}, ${inr(i.net)} · ${propName(i.propertyId)}`, to: 'ToApprove', ref: i.id }))
  R.invoices.filter(i => i.status === 'Submitted' && i.source !== 'Generated').forEach(i => items.push({ id: `sub:${i.id}`, at: i.createdAt || i.date, icon: 'file-text', tone: 'blue', title: 'Owner sent an invoice', sub: `${ownerName(i.ownerId)}, ${inr(i.net)} · ${propName(i.propertyId)}`, to: 'Invoices', ref: i.id }))
  tickets.forEach(t => { const due = slaDue(t); if (due < now) items.push({ id: `sla:${t._id}`, at: due.toISOString(), icon: 'wrench', tone: 'coral', title: `${t.no} is past SLA`, sub: `${propName(t.propertyId)} · ${t.title}`, to: 'TicketDetail', ref: t._id }) })
  messages.forEach(m => items.push({ id: `msg:${m._id}`, at: m.at || m.createdAt, icon: 'message', tone: 'blue', title: `${m.by || ownerName(m.ownerId)} sent a ${m.kind === 'Message' ? 'message' : m.kind.toLowerCase()}`, sub: `${propName(m.propertyId)} · ${String(m.text || '').slice(0, 80)}`, to: 'Thread', ref: m.propertyId }))
  inspections.forEach(i => items.push({ id: `insp:${i._id}`, at: i.updatedAt || i.createdAt || i.date, icon: 'inspect', tone: 'amber', title: 'Inspection waiting for the owner', sub: `${propName(i.propertyId)} · ${i.kind === 'Move-in' ? 'take-over' : 'handover'}`, to: 'SignOff', ref: i._id }))
  sites.forEach(s => items.push({ id: `site:${s._id}`, at: s.updatedAt || s.createdAt, icon: 'map-pin', tone: 'blue', title: 'Site waiting for approval', sub: `${s.name}${s.quotedRent ? `, ${inr(s.quotedRent)}` : ''}`, to: 'SiteEvaluation', ref: s._id }))
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  return items.map(x => ({ ...x, when: ago(x.at, now) }))
}
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN')

export async function notifications(req, res) {
  const R = await reportContext(req.user)
  const [items, st] = await Promise.all([buildFeed(R), NotifState.findById(req.user.id).lean()])
  const read = new Set(st?.read || []), gone = new Set(st?.dismissed || [])
  const list = items.filter(x => !gone.has(x.id) && (!st?.clearedAt || x.at > st.clearedAt)).map(x => ({ ...x, read: read.has(x.id) }))
  const unread = list.filter(x => !x.read).length
  return ok(res, unread ? `${unread} unread notification${unread === 1 ? '' : 's'}.` : list.length ? 'All read.' : 'Nothing new.', { items: list, unread })
}
export async function markRead(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null
  if (ids) await NotifState.findByIdAndUpdate(req.user.id, { $addToSet: { read: { $each: ids } } }, { upsert: true })
  else { const R = await reportContext(req.user); const all = (await buildFeed(R)).map(x => x.id); await NotifState.findByIdAndUpdate(req.user.id, { $addToSet: { read: { $each: all } } }, { upsert: true }) }
  return ok(res, ids ? 'Marked as read.' : 'All marked as read.', { ok: true })
}
export async function dismiss(req, res) {
  await NotifState.findByIdAndUpdate(req.user.id, { $addToSet: { dismissed: String(req.params.id) } }, { upsert: true })
  return ok(res, 'Notification deleted.', { id: req.params.id })
}
export async function clearAll(req, res) {
  await NotifState.findByIdAndUpdate(req.user.id, { clearedAt: new Date().toISOString() }, { upsert: true })
  return ok(res, 'All notifications deleted.', { ok: true })
}

/* ---------- site evaluation: the record plus everything the phone needs computed ---------- */
export async function site(req, res) {
  const st = await models.sites.findById(req.params.id).lean()
  if (!st || !matches(st, await scopeFilter('sites', req.user))) throw notFound(`No site found with id “${req.params.id}”.`)
  const s = { ...st, id: st._id }
  const [reqDoc, partner] = await Promise.all([s.reqId ? models.reqs.findById(s.reqId).lean() : null, null])
  const checks = s.checks || {}
  const items = SITE_ITEMS.map(it => ({ ...it, v: checks[it.k]?.v || '', remark: checks[it.k]?.remark || '', photos: checks[it.k]?.photos || [] }))
  const data = { site: s, req: reqDoc ? { ...reqDoc, id: reqDoc._id } : null, score: siteScore(s), catch: catchIndex(s), items, sections: [...new Set(SITE_ITEMS.map(i => i.sec))] }
  return ok(res, `${s.name || s.code}: ${data.score.done} of ${data.score.total} checks done, ${data.score.verdict.toLowerCase()}.`, data)
}
