/*
 * Generic CRUD handlers built from a resource config (see resources/config.js).
 *
 *   GET    /api/<resource>?search=&page=&limit=&sort=&order=&from=&to=&<filters>   list (paginated)
 *   GET    /api/<resource>/:id                                                      one record
 *   POST   /api/<resource>                                                          create
 *   PUT    /api/<resource>/:id                                                      create or replace (the app's "save")
 *   PATCH  /api/<resource>/:id                                                      update some fields
 *   DELETE /api/<resource>/:id                                                      delete
 *
 * Every response carries a human-readable `message` meant to be shown to the user as-is.
 */
import { models, toApi } from '../models/index.js'
import { byPath, FIELD_LABELS } from '../resources/config.js'
import { CHECKS } from '../resources/checks.js'
import { buildListQuery, pageInfo } from '../utils/listQuery.js'
import { ApiError, badRequest, notFound, conflict } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'
import { cap, count, named, article } from '../utils/text.js'
import { newId } from '../utils/ids.js'
import { scopeFilter, matches } from '../auth/scope.js'

const isBlank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const fieldLabel = (cfg, f) => (cfg.required || []).find(([k]) => k === f)?.[1] || cfg.labels?.[f] || FIELD_LABELS[f] || f

function bodyOf(cfg, req) {
  const b = req.body
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw badRequest(`Send the ${cfg.singular} as a JSON object.`)
  const { _id, id, ...rest } = b // eslint-disable-line no-unused-vars
  return rest
}

/** Field checks: required (full records only), allowed values, numbers. Throws one readable 400. */
function validate(cfg, rec, { partial } = {}) {
  const errors = {}
  if (!partial) for (const [f, label] of cfg.required || []) if (isBlank(rec[f])) errors[f] = `${label} is required`
  for (const [f, allowed] of Object.entries(cfg.enums || {})) {
    if (!isBlank(rec[f]) && !allowed.includes(rec[f])) errors[f] = `${cap(fieldLabel(cfg, f))} must be one of: ${allowed.filter(Boolean).join(', ')}`
  }
  for (const f of cfg.numbers || []) if (!isBlank(rec[f]) && !errors[f] && Number.isNaN(Number(rec[f]))) errors[f] = `${cap(fieldLabel(cfg, f))} must be a number`
  const list = Object.values(errors)
  if (list.length === 1) throw badRequest(list[0] + '.', errors)
  if (list.length > 1) throw badRequest(`Please fix ${list.length} fields: ${list.join('; ')}.`, errors)
}

/** Rules from resources/checks.js (co-owners, deposit adjustments, opening balances, TDS…). Throws one readable 400. */
async function deepCheck(cfg, rec) {
  const fn = CHECKS[cfg.path]
  if (!fn) return
  const errors = await fn(rec, { models })
  const list = Object.values(errors)
  if (list.length === 1) throw badRequest(list[0] + '.', errors)
  if (list.length > 1) throw badRequest(`Please fix ${list.length} fields: ${list.join('; ')}.`, errors)
}

/** Linked records (propertyId, leaseId…) must exist. */
async function checkRefs(cfg, rec) {
  for (const [f, path] of Object.entries(cfg.refs || {})) {
    if (isBlank(rec[f])) continue
    if (!(await models[path].exists({ _id: rec[f] }))) throw badRequest(`${cap(byPath[path].singular)} “${rec[f]}” does not exist, so this ${cfg.singular} can’t be linked to it.`, { [f]: 'Not found' })
  }
}

/** Unique field groups (site code, lease ref, invoice number per owner…). */
async function checkUnique(cfg, rec, id) {
  for (const group of cfg.unique || []) {
    if (group.some(f => isBlank(rec[f]))) continue
    const clash = await models[cfg.path].findOne({ ...Object.fromEntries(group.map(f => [f, rec[f]])), _id: { $ne: id } }).lean()
    if (clash) {
      const main = group[group.length - 1]
      throw conflict(`${cap(fieldLabel(cfg, main))} “${rec[main]}” is already used by ${named(cfg.singular, cfg.label(clash))}${group.length > 1 ? ' for the same ' + group.slice(0, -1).map(f => fieldLabel(cfg, f).replace(/Id$/, '')).join(', ') : ''}.`)
    }
  }
}

const stamp = (rec, existing) => {
  const now = new Date().toISOString()
  return { ...rec, createdAt: existing?.createdAt || rec.createdAt || now, updatedAt: now }
}

export function crudController(cfg) {
  const Model = models[cfg.path]
  const nameOf = rec => named(cfg.singular, cfg.label(rec))
  const missing = id => notFound(`No ${cfg.singular} found with id “${id}”. It may have been deleted.`)
  /** Owners and franchise partners may only touch their own premises and linked records. */
  const outOfScope = () => new ApiError(403, `You can only add or change ${cfg.plural} for your own premises.`, { code: 'forbidden' })
  const inScope = (rec, scope) => !scope || matches(rec, scope)
  const ROLE_WORDS = { admin: 'administrators', staff: 'TrustLab staff', owner: 'property owners', franchisee: 'franchise partners' }
  /** Some records are read-only for some roles (e.g. owners can see their Form 16A but not change TDS records). */
  const canWrite = user => {
    if (cfg.writeRoles && !cfg.writeRoles.includes(user.role)) throw new ApiError(403, `${cap(ROLE_WORDS[user.role] || 'You')} can view ${cfg.plural} but can’t change them.`, { code: 'forbidden' })
  }
  const view = (rec, user) => (cfg.view ? cfg.view(rec, user) : rec)
  const scopeFor = (user, write) => scopeFilter(cfg.path, user, { write })

  return {
    async list(req, res) {
      const q = buildListQuery(cfg, req.query)
      const scope = await scopeFilter(cfg.path, req.user)
      if (scope) q.filter = { $and: [...(q.filter.$and || []), scope] }
      const [items, total] = await Promise.all([
        Model.find(q.filter).sort(q.sort).skip(q.skip).limit(q.limit).lean(),
        Model.countDocuments(q.filter),
      ])
      const p = pageInfo(total, q.page, q.limit)
      const filtered = Object.keys(req.query).some(k => !['page', 'limit', 'sort', 'order', 'search'].includes(k))
      let message
      if (!total) message = q.search ? `No ${cfg.plural} match “${q.search}”.` : `No ${cfg.plural} found${filtered ? ' for these filters' : ''}.`
      else if (q.page > p.totalPages) message = `Page ${q.page} is past the end — there ${total === 1 ? 'is' : 'are'} ${count(total, cfg.singular, cfg.plural)} on ${count(p.totalPages, 'page', 'pages')}.`
      else message = `${cap(count(total, cfg.singular, cfg.plural))} found${q.search ? ` for “${q.search}”` : ''}${p.totalPages > 1 ? ` · showing ${q.skip + 1}–${q.skip + items.length}` : ''}.`
      return ok(res, message, items.map(r => view(toApi(r), req.user)), p)
    },

    async get(req, res) {
      const rec = await Model.findById(req.params.id).lean()
      if (!rec || !inScope(rec, await scopeFilter(cfg.path, req.user))) throw missing(req.params.id)
      return ok(res, `${nameOf(rec)} loaded.`, view(toApi(rec), req.user))
    },

    async create(req, res) {
      canWrite(req.user)
      const body = bodyOf(cfg, req)
      const id = isBlank(req.body.id) ? newId() : String(req.body.id)
      if (await Model.exists({ _id: id })) throw conflict(`${cap(article(cfg.singular))} with id “${id}” already exists.`)
      if (!inScope({ _id: id, ...body }, await scopeFor(req.user, true))) throw outOfScope()
      validate(cfg, body); await checkRefs(cfg, body); await deepCheck(cfg, body); await checkUnique(cfg, body, id)
      const rec = stamp(body)
      await Model.create({ _id: id, ...rec })
      return created(res, `${nameOf(rec)} created.`, { id, ...rec })
    },

    async replace(req, res) {
      canWrite(req.user)
      const id = req.params.id
      const body = bodyOf(cfg, req)
      const existing = await Model.findById(id).lean()
      if (existing && !inScope(existing, await scopeFor(req.user))) throw missing(id)
      const scope = await scopeFor(req.user, true)
      if (existing && !inScope(existing, scope)) throw outOfScope()
      if (!inScope({ _id: id, ...body }, scope)) throw outOfScope()
      validate(cfg, body); await checkRefs(cfg, body); await deepCheck(cfg, body); await checkUnique(cfg, body, id)
      const rec = stamp(body, existing)
      if (existing) {
        await Model.replaceOne({ _id: id }, rec)
        return ok(res, `${nameOf(rec)} updated.`, { id, ...rec })
      }
      await Model.create({ _id: id, ...rec })
      return created(res, `${nameOf(rec)} created.`, { id, ...rec })
    },

    async patch(req, res) {
      canWrite(req.user)
      const id = req.params.id
      const body = bodyOf(cfg, req)
      if (!Object.keys(body).length) throw badRequest(`Nothing to update — send the ${cfg.singular} fields to change.`)
      const existing = await Model.findById(id).lean()
      if (!existing || !inScope(existing, await scopeFor(req.user))) throw missing(id)
      const scope = await scopeFor(req.user, true)
      if (!inScope(existing, scope)) throw outOfScope()
      const { _id, ...current } = existing // eslint-disable-line no-unused-vars
      const merged = { ...current, ...body }
      if (!inScope({ _id: id, ...merged }, scope)) throw outOfScope()
      validate(cfg, body, { partial: true }); validate(cfg, merged); await checkRefs(cfg, body); await deepCheck(cfg, merged); await checkUnique(cfg, merged, id)
      const rec = stamp(merged, existing)
      await Model.replaceOne({ _id: id }, rec)
      return ok(res, `${nameOf(rec)} updated.`, { id, ...rec })
    },

    async remove(req, res) {
      canWrite(req.user)
      const id = req.params.id
      const rec = await Model.findById(id).lean()
      if (!rec || !inScope(rec, await scopeFor(req.user))) throw missing(id)
      if (!inScope(rec, await scopeFor(req.user, true))) throw outOfScope()
      const blockers = []
      for (const [path, field] of cfg.dependents || []) {
        const n = await models[path].countDocuments({ $or: [].concat(field).map(f => ({ [f]: id })) })
        if (n) blockers.push(count(n, byPath[path].singular, byPath[path].plural))
      }
      if (blockers.length) throw new ApiError(409, `${nameOf(rec)} can’t be deleted because it still has ${blockers.join(' and ')}. Delete or move those first.`, { code: 'has_dependents' })
      await Model.deleteOne({ _id: id })
      return ok(res, `${nameOf(rec)} deleted.`, { id })
    },
  }
}
