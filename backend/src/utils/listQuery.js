/*
 * Turns list query params into a MongoDB query.
 *   ?search=text        partial, case-insensitive match on the resource's search fields
 *   ?page=1&limit=10    pagination (limit 1–100, default 10)
 *   ?sort=field&order=asc|desc
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   range on the resource's date field
 *   ?<filter>=value     exact match; comma-separated values match any of them (or a computed filter via opts.build)
 */
import { badRequest } from './ApiError.js'

export const DEFAULT_LIMIT = 10
export const MAX_LIMIT = 100
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const DATE = /^\d{4}-\d{2}-\d{2}/

function toInt(value, name, { min, fallback }) {
  if (value === undefined || value === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < min) throw badRequest(`“${name}” must be a whole number of at least ${min}.`)
  return n
}

function coerce(raw, type, param) {
  if (type === 'bool') {
    if (raw === 'true') return true
    if (raw === 'false') return false
    throw badRequest(`“${param}” must be true or false.`)
  }
  if (type === 'number') {
    const n = Number(raw)
    if (Number.isNaN(n)) throw badRequest(`“${param}” must be a number.`)
    return n
  }
  return raw
}

export function buildListQuery(cfg, query) {
  const page = toInt(query.page, 'page', { min: 1, fallback: 1 })
  const limit = Math.min(toInt(query.limit, 'limit', { min: 1, fallback: DEFAULT_LIMIT }), MAX_LIMIT)
  const and = []

  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    and.push({ $or: cfg.search.map(f => ({ [f]: rx })) })
  }

  for (const [param, opts] of Object.entries(cfg.filters || {})) {
    const raw = query[param]
    if (raw === undefined || raw === '') continue
    const values = String(raw).split(',').map(v => coerce(v.trim(), opts.type, param))
    if (opts.build) { and.push(opts.build(values[0])); continue }
    and.push({ [opts.field || param]: values.length > 1 ? { $in: values } : values[0] })
  }

  if (query.from || query.to) {
    if (!cfg.dateField) throw badRequest(`${cfg.plural} cannot be filtered by date.`)
    for (const [k, v] of [['from', query.from], ['to', query.to]]) if (v && !DATE.test(v)) throw badRequest(`“${k}” must be a date like 2026-04-01.`)
    const range = {}
    if (query.from) range.$gte = query.from
    if (query.to) range.$lte = query.to.length === 10 ? query.to + 'T99' : query.to // whole day: '2026-10-15T99' sorts after any time that day
    and.push({ [cfg.dateField]: range })
  }

  let sort = cfg.sort
  if (query.sort) {
    if (!/^[A-Za-z][\w.]*$/.test(query.sort)) throw badRequest('“sort” must be a field name.')
    const order = (query.order || 'asc').toLowerCase()
    if (!['asc', 'desc'].includes(order)) throw badRequest('“order” must be asc or desc.')
    sort = { [query.sort]: order === 'desc' ? -1 : 1 }
  }

  return { filter: and.length ? { $and: and } : {}, page, limit, skip: (page - 1) * limit, sort: { ...sort, _id: 1 }, search }
}

export function pageInfo(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
}
