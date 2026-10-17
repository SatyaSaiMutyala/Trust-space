/*
 * Trash — records that were deleted (soft-deleted: deletedAt/deletedBy set) and can be restored or removed for good.
 *   GET    /api/trash                          trashed records the user may see, grouped by category (resource)
 *   POST   /api/trash/:resource/:id/restore    put a record back
 *   DELETE /api/trash/:resource/:id            delete permanently (same roles that may delete the resource)
 *   DELETE /api/trash                          empty the Trash the user may see (admin only)
 * Scope is the same as the resource lists (an owner sees only their own trashed records, a franchise partner their workspace).
 */
import { models, toApi } from '../models/index.js'
import { RESOURCES, byPath } from '../resources/config.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { ApiError, notFound } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { cap, count, named } from '../utils/text.js'

const TRASHED = { deletedAt: { $exists: true } }
const withDeleted = { withDeleted: true }
const cfgOf = path => { const cfg = byPath[path]; if (!cfg) throw notFound(`There is no “${path}” category.`); return cfg }
const canWrite = (cfg, user) => { if (cfg.writeRoles && !cfg.writeRoles.includes(user.role)) throw new ApiError(403, `You can’t change ${cfg.plural}.`, { code: 'forbidden' }) }

/** A short second line for a trashed record: its title/name, the premises it belongs to, or a date — all searchable on the page. */
async function subOf(cfg, rec, propNames) {
  const bits = []
  const title = rec.title || rec.desc || rec.name || rec.ref
  if (title && title !== cfg.label(rec)) bits.push(String(title))
  if (rec.propertyId && propNames[rec.propertyId]) bits.push(propNames[rec.propertyId])
  if (!bits.length && cfg.dateField && rec[cfg.dateField]) bits.push(String(rec[cfg.dateField]).slice(0, 10))
  return bits.join(' · ')
}

export async function list(req, res) {
  const props = await models.properties.find({}, { name: 1 }).setOptions(withDeleted).lean()
  const propNames = Object.fromEntries(props.map(p => [p._id, p.name]))
  const categories = []
  for (const cfg of RESOURCES) {
    const scope = await scopeFilter(cfg.path, req.user)
    const filter = scope ? { $and: [TRASHED, scope] } : TRASHED
    const rows = await models[cfg.path].find(filter).sort({ deletedAt: -1 }).setOptions(withDeleted).lean()
    if (!rows.length) continue
    const items = []
    for (const r of rows) items.push({ id: r._id, label: cfg.label(r) || r._id, sub: await subOf(cfg, r, propNames), deletedAt: r.deletedAt, deletedBy: r.deletedBy || '' })
    categories.push({ resource: cfg.path, singular: cfg.singular, plural: cfg.plural, canWrite: !cfg.writeRoles || cfg.writeRoles.includes(req.user.role), items })
  }
  const total = categories.reduce((a, c) => a + c.items.length, 0)
  return ok(res, total ? `${cap(count(total, 'record', 'records'))} in Trash.` : 'Trash is empty.', { total, categories })
}

async function trashedRecord(req) {
  const cfg = cfgOf(req.params.resource)
  const rec = await models[cfg.path].findOne({ _id: req.params.id, ...TRASHED }).setOptions(withDeleted).lean()
  if (!rec || !matches(rec, await scopeFilter(cfg.path, req.user))) throw notFound(`No ${cfg.singular} “${req.params.id}” in Trash.`)
  return { cfg, rec }
}

export async function restore(req, res) {
  const { cfg, rec } = await trashedRecord(req)
  canWrite(cfg, req.user)
  for (const [f, path] of Object.entries(cfg.refs || {})) { // a restored record still needs the records it links to
    if (rec[f] && !(await models[path].exists({ _id: rec[f] }))) throw new ApiError(409, `${named(cfg.singular, cfg.label(rec))} can’t be restored: the ${byPath[path].singular} it belongs to is in Trash or gone. Restore that first.`, { code: 'ref_missing' })
  }
  await models[cfg.path].updateOne({ _id: rec._id }, { $unset: { deletedAt: 1, deletedBy: 1 } }).setOptions(withDeleted)
  const back = await models[cfg.path].findById(rec._id).lean()
  return ok(res, `${named(cfg.singular, cfg.label(rec))} restored.`, toApi(back))
}

export async function destroy(req, res) {
  const { cfg, rec } = await trashedRecord(req)
  canWrite(cfg, req.user)
  await models[cfg.path].deleteOne({ _id: rec._id }).setOptions(withDeleted)
  return ok(res, `${named(cfg.singular, cfg.label(rec))} deleted permanently.`, { id: rec._id })
}

export async function empty(req, res) {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Only administrators can empty the Trash.', { code: 'forbidden' })
  let n = 0
  for (const cfg of RESOURCES) {
    const scope = await scopeFilter(cfg.path, req.user)
    const r = await models[cfg.path].deleteMany(scope ? { $and: [TRASHED, scope] } : TRASHED).setOptions(withDeleted)
    n += r.deletedCount || 0
  }
  return ok(res, n ? `Trash emptied — ${count(n, 'record', 'records')} deleted permanently.` : 'Trash was already empty.', { deleted: n })
}
