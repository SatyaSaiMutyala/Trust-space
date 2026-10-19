/*
 * Owner messages for the phone app: one thread per property between the facilities side ('tdpl') and its owner(s).
 *   GET  /api/mobile/threads                       every thread the user may see: property, people, last message, unread
 *   GET  /api/mobile/threads/:propertyId?before=   the messages of one thread (newest 50; `before` = ISO time for older ones)
 *   POST /api/mobile/threads/:propertyId/read      mark the other side's messages as read for my side
 * Sending uses POST /api/messages (the same record the web writes). Franchise partners write as the tenant side too.
 */
import { models, toApi } from '../models/index.js'
import { ok } from '../utils/respond.js'
import { notFound } from '../utils/ApiError.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { leaseOwners } from '../../../shared/calc/index.js'

const sideOf = u => (u.role === 'owner' ? 'owner' : 'tdpl')
const initialsOf = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
const PAGE = 50

/** Owners of a property's current lease (or the property's owners) → [{ id, name, initials }]. */
async function peopleOf(P, leasesByProp, ownersById) {
  const L = (leasesByProp[P._id] || []).sort((a, b) => b.start.localeCompare(a.start))[0]
  const ids = L ? leaseOwners({ ...L, id: L._id }).map(o => o.ownerId) : (Array.isArray(P.owners) && P.owners.length ? P.owners.map(o => o.ownerId) : [P.ownerId]).filter(Boolean)
  return ids.map(id => ({ id, name: ownersById[id]?.name || '', initials: initialsOf(ownersById[id]?.name) }))
}

export async function threads(req, res) {
  const user = req.user; const side = sideOf(user)
  const props = await models.properties.find((await scopeFilter('properties', user)) || {}).lean()
  const ids = props.map(p => p._id)
  const [msgs, leases, owners] = await Promise.all([
    models.messages.find({ propertyId: { $in: ids } }).sort({ at: -1 }).lean(),
    models.leases.find({ propertyId: { $in: ids } }, { propertyId: 1, ownerId: 1, owners: 1, start: 1 }).lean(),
    models.owners.find({}, { name: 1 }).lean(),
  ])
  const ownersById = Object.fromEntries(owners.map(o => [o._id, o])); const leasesByProp = {}
  leases.forEach(l => { (leasesByProp[l.propertyId] = leasesByProp[l.propertyId] || []).push(l) })
  const rows = []
  for (const P of props) {
    const mine = msgs.filter(m => m.propertyId === P._id)
    if (!mine.length && P.status === 'Pipeline') continue // nothing said yet about a premises not taken over
    const last = mine[0]
    const unread = mine.filter(m => m.from !== side && !(m.read || {})[side]).length
    rows.push({ propertyId: P._id, title: P.name, code: P.code, city: P.city, people: await peopleOf(P, leasesByProp, ownersById), last: last ? { id: last._id, text: last.text, kind: last.kind, from: last.from, by: last.by, at: last.at, files: (last.files || []).length } : null, unread })
  }
  rows.sort((a, b) => (b.last?.at || '').localeCompare(a.last?.at || '') || a.title.localeCompare(b.title))
  const total = rows.reduce((a, r) => a + r.unread, 0)
  return ok(res, total ? `${total} unread message${total === 1 ? '' : 's'}.` : rows.length ? 'No unread messages.' : 'No conversations yet.', { threads: rows, unread: total, side })
}

async function propertyFor(req) {
  const P = await models.properties.findById(req.params.propertyId).lean()
  if (!P || !matches(P, await scopeFilter('properties', req.user))) throw notFound(`No property found with id “${req.params.propertyId}”.`)
  return P
}

export async function thread(req, res) {
  const user = req.user; const side = sideOf(user); const P = await propertyFor(req)
  const before = typeof req.query.before === 'string' && req.query.before ? req.query.before : null
  const filter = { propertyId: P._id, ...(before ? { at: { $lt: before } } : {}) }
  const page = await models.messages.find(filter).sort({ at: -1 }).limit(PAGE + 1).lean()
  const more = page.length > PAGE; const items = page.slice(0, PAGE).reverse().map(toApi)
  const [leases, owners] = await Promise.all([models.leases.find({ propertyId: P._id }, { propertyId: 1, ownerId: 1, owners: 1, start: 1 }).lean(), models.owners.find({}, { name: 1 }).lean()])
  const people = await peopleOf(P, { [P._id]: leases }, Object.fromEntries(owners.map(o => [o._id, o])))
  const unread = items.filter(m => m.from !== side && !(m.read || {})[side]).length
  return ok(res, unread ? `${unread} new message${unread === 1 ? '' : 's'}.` : `${items.length} message${items.length === 1 ? '' : 's'}.`, { propertyId: P._id, title: P.name, code: P.code, people, side, messages: items, more, oldest: items[0]?.at || null })
}

export async function markRead(req, res) {
  const side = sideOf(req.user); const P = await propertyFor(req)
  const r = await models.messages.updateMany({ propertyId: P._id, from: { $ne: side }, [`read.${side}`]: { $ne: true } }, { $set: { [`read.${side}`]: true, updatedAt: new Date().toISOString() } })
  return ok(res, r.modifiedCount ? `${r.modifiedCount} message${r.modifiedCount === 1 ? '' : 's'} marked read.` : 'Nothing new.', { marked: r.modifiedCount })
}
