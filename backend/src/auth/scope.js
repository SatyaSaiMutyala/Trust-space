/*
 * Which records a signed-in user may see and change.
 *   admin, staff      TrustLab's workspace: everything except premises managed by franchise partners (and records
 *                     linked to them); scouting, requirements, partners and all owners not tied to a partner
 *   owner             the properties they own or co-own (a co-owner is listed in the property's or a lease's `owners`), the leases,
 *                     tickets, messages and inspections linked to them, their own invoices, their own owner record and
 *                     the names of their co-owners, and Form 16A on TDS returns (read-only)
 *   franchisee        their partner record, the franchise premises they manage (and linked records), their owners,
 *                     their scouting requirements and sites, and the TDS records of their own workspace
 * scopeFilter(path, user, { write }) returns a MongoDB filter (null = no limit); with write: true it is the narrower set
 * a user may create or change (an owner may change only their own owner record). matches() checks a record against that filter in memory,
 * so new or changed records can be checked before they are saved.
 */
import { models } from '../models/index.js'

const NONE = { _id: { $in: [] } }
const LINKED = ['leases', 'invoices', 'tickets', 'messages', 'inspections']
const TDPL_TDS = { $or: [{ ws: 'tdpl' }, { ws: { $exists: false } }] }

async function ctx(user) {
  let propFilter
  if (user.role === 'owner') {
    const coOwned = await models.leases.find({ 'owners.ownerId': user.ownerId }).distinct('propertyId')
    propFilter = { $or: [{ ownerId: user.ownerId }, { 'owners.ownerId': user.ownerId }, ...(coOwned.length ? [{ _id: { $in: coOwned } }] : [])] }
  } else propFilter = { managedBy: 'franchise', partnerId: user.partnerId }
  const props = await models.properties.find(propFilter, { _id: 1, ownerId: 1, owners: 1, partnerId: 1 }).lean()
  const propIds = props.map(p => p._id)
  const coOwners = await models.leases.find({ propertyId: { $in: propIds } }).distinct('owners.ownerId')
  const propOwners = props.flatMap(p => (Array.isArray(p.owners) ? p.owners.map(o => o.ownerId) : []))
  return { propFilter, propIds, ownerIds: [...new Set(props.map(p => p.ownerId).concat(propOwners, coOwners).filter(Boolean))], partnerIds: [...new Set(props.map(p => p.partnerId).filter(Boolean))] }
}

const NOT_FRANCHISE = { managedBy: { $ne: 'franchise' } }
const NO_PARTNER = { $or: [{ partnerId: { $exists: false } }, { partnerId: null }, { partnerId: '' }] }

export async function scopeFilter(path, user, { write = false } = {}) {
  if (!user) return NONE
  if (user.role === 'admin' || user.role === 'staff') {
    if (path === 'properties') return NOT_FRANCHISE
    if (LINKED.includes(path)) return { propertyId: { $nin: await models.properties.find({ managedBy: 'franchise' }).distinct('_id') } }
    if (path === 'owners') return NO_PARTNER
    if (path === 'tds') return TDPL_TDS
    return null
  }
  if (user.role === 'owner' && path === 'owners' && write) return { _id: user.ownerId }
  if (user.role === 'owner' && path === 'tds') return { kind: 'return' } // read-only; only their own Form 16A is shown
  const c = await ctx(user)
  if (path === 'properties') return c.propFilter
  if (user.role === 'owner' && path === 'invoices') return { propertyId: { $in: c.propIds }, ownerId: user.ownerId } // co-owners invoice separately
  if (LINKED.includes(path)) return { propertyId: { $in: c.propIds } }
  if (user.role === 'owner') {
    if (path === 'owners') return { _id: { $in: c.ownerIds.includes(user.ownerId) ? c.ownerIds : [user.ownerId, ...c.ownerIds] } } // self + co-owners
    if (path === 'partners') return { _id: { $in: c.partnerIds } } // names of franchise partners renting their premises
    return NONE // sites, reqs, people
  }
  // franchisee
  if (path === 'tds') return { ws: user.partnerId }
  if (path === 'owners') return { $or: [{ _id: { $in: c.ownerIds } }, { partnerId: user.partnerId }] }
  if (path === 'partners') return { _id: user.partnerId }
  if (path === 'reqs') return { partnerId: user.partnerId }
  if (path === 'sites') {
    const reqIds = await models.reqs.find({ partnerId: user.partnerId }).distinct('_id')
    return { reqId: { $in: reqIds } }
  }
  return NONE
}

/** In-memory check of a record against the simple filters built above ($or, $and, $in, $nin, $ne, $exists, equality). */
export function matches(rec, filter) {
  if (!filter) return true
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return cond.some(f => matches(rec, f))
    if (k === '$and') return cond.every(f => matches(rec, f))
    const v = k === '_id' ? (rec._id ?? rec.id) : rec[k]
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return cond.$in.includes(v)
      if ('$nin' in cond) return !cond.$nin.includes(v)
      if ('$ne' in cond) return v !== cond.$ne
      if ('$exists' in cond) return (v !== undefined) === cond.$exists
    }
    return v === cond
  })
}
