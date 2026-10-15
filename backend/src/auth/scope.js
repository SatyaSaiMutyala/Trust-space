/*
 * Which records a signed-in user may see and change.
 *   admin, staff      TrustLab's workspace: everything except premises managed by franchise partners (and records
 *                     linked to them); scouting, requirements, partners and all owners not tied to a partner
 *   owner             their own owner record, the properties they own and everything linked to those properties
 *   franchisee        their partner record, the franchise premises they manage (and linked records), their owners,
 *                     their scouting requirements and sites
 * scopeFilter() returns a MongoDB filter (null = no limit). matches() checks a record against that filter in memory,
 * so new or changed records can be checked before they are saved.
 */
import { models } from '../models/index.js'

const NONE = { _id: { $in: [] } }
const LINKED = ['leases', 'invoices', 'tickets', 'messages', 'inspections']

async function ctx(user) {
  const propFilter = user.role === 'owner' ? { ownerId: user.ownerId } : { managedBy: 'franchise', partnerId: user.partnerId }
  const props = await models.properties.find(propFilter, { _id: 1, ownerId: 1, partnerId: 1 }).lean()
  return { propFilter, propIds: props.map(p => p._id), ownerIds: [...new Set(props.map(p => p.ownerId).filter(Boolean))], partnerIds: [...new Set(props.map(p => p.partnerId).filter(Boolean))] }
}

const NOT_FRANCHISE = { managedBy: { $ne: 'franchise' } }
const NO_PARTNER = { $or: [{ partnerId: { $exists: false } }, { partnerId: null }, { partnerId: '' }] }

export async function scopeFilter(path, user) {
  if (!user) return NONE
  if (user.role === 'admin' || user.role === 'staff') {
    if (path === 'properties') return NOT_FRANCHISE
    if (LINKED.includes(path)) return { propertyId: { $nin: await models.properties.find({ managedBy: 'franchise' }).distinct('_id') } }
    if (path === 'owners') return NO_PARTNER
    return null
  }
  const c = await ctx(user)
  if (path === 'properties') return c.propFilter
  if (LINKED.includes(path)) return { propertyId: { $in: c.propIds } }
  if (user.role === 'owner') {
    if (path === 'owners') return { _id: user.ownerId }
    if (path === 'partners') return { _id: { $in: c.partnerIds } } // names of franchise partners renting their premises
    return NONE // sites, reqs, people
  }
  // franchisee
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
