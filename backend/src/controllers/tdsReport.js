/*
 * TDS compliance, computed on the server with the shared calculation module (shared/calc/tds.js):
 *   GET /api/tds/report?fy=26-27          register (month rows), quarterly returns, every deduction, challans of the year
 *   GET /api/tds/return.csv?fy=26-27&q=2  deductee-wise lines for the quarterly return utility
 *   GET /api/tds/owner/:ownerId/f16       an owner's TDS by quarter with Form 16A status (owners: their own only)
 * The workspace is TrustLab's for admin/staff and the partner's own for franchisees; owners cannot see the register.
 */
import { models, toApi } from '../models/index.js'
import { scopeFilter } from '../auth/scope.js'
import { ApiError, badRequest } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { makeCtx, tdsEntries, tdsMonthRows, tdsQuarters, tdsQcsv, quarterOf, qDue, F16_DUE, fy as fyOf, inr } from '../../../shared/calc/index.js'

const FY = /^\d{2}-\d{2}$/
/** Dates are judged in India, whatever the server's clock zone. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const wsOf = user => (user.role === 'franchisee' ? user.partnerId : 'tdpl')
const forbidden = msg => new ApiError(403, msg, { code: 'forbidden' })

/** Calculation context for the signed-in user: the invoices, leases and TDS records they may see, all owners and premises for lookups. */
export async function tdsContext(user) {
  const [invoices, leases, owners, props, docs] = await Promise.all([
    models.invoices.find((await scopeFilter('invoices', user)) || {}).lean(),
    models.leases.find((await scopeFilter('leases', user)) || {}).lean(),
    models.owners.find({}).lean(),
    models.properties.find({}, { code: 1, name: 1 }).lean(),
    models.tds.find((await scopeFilter('tds', user)) || {}).lean(),
  ])
  const tds = docs.map(toApi)
  const ctx = makeCtx({ today: todayIST(), owners: owners.map(toApi), props: props.map(toApi), invoices: invoices.map(toApi) })
  return { ...ctx, leases: leases.map(toApi), tdsDocs: kind => tds.filter(x => x.kind === kind) }
}

const fyParam = (q, ctx) => { const f = q.fy || fyOf(ctx.today); if (!FY.test(f)) throw badRequest('Financial year should look like 26-27.', { fy: 'Bad format' }); return f }

export async function report(req, res) {
  if (req.user.role === 'owner') throw forbidden('Property owners see their own TDS and Form 16A under Ledgers; the TDS register is for TrustLab and franchise partners.')
  const ctx = await tdsContext(req.user); const f = fyParam(req.query, ctx)
  const entries = tdsEntries(ctx); const rows = tdsMonthRows(f, ctx); const quarters = tdsQuarters(f, ctx)
  const fys = [...new Set([fyOf(ctx.today), ...entries.map(x => fyOf(x.date))])].sort().reverse()
  const challans = ctx.tdsDocs('challan').filter(c => fyOf(c.month + '-01') === f).sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0))
  const ded = rows.reduce((a, r) => a + r.ded, 0), dep = rows.reduce((a, r) => a + r.dep, 0)
  return ok(res, `TDS for FY ${f}: ${inr(ded)} deducted, ${inr(dep)} deposited.`, { fy: f, today: ctx.today, ws: wsOf(req.user), fys, entries, rows, quarters, challans })
}

export async function returnCsv(req, res) {
  if (req.user.role === 'owner') throw forbidden('Property owners can’t download the TDS return data.')
  const ctx = await tdsContext(req.user); const f = fyParam(req.query, ctx); const q = Number(req.query.q)
  if (![1, 2, 3, 4].includes(q)) throw badRequest('Quarter should be 1, 2, 3 or 4.', { q: 'Bad value' })
  res.type('text/csv').attachment(`TDS-FY${f}-Q${q}-deductees.csv`).send(tdsQcsv(f, q, ctx))
}

export async function ownerF16(req, res) {
  const id = req.params.ownerId
  if (req.user.role === 'owner' && req.user.ownerId !== id) throw forbidden('You can only see your own TDS and Form 16A.')
  const O = await models.owners.findById(id).lean()
  if (!O) throw new ApiError(404, `No owner found with id “${id}”.`, { code: 'not_found' })
  const ctx = await tdsContext(req.user)
  const ent = tdsEntries(ctx).filter(x => x.ownerId === id)
  const issued = []; ctx.tdsDocs('return').forEach(r => { const x = (r.f16a || {})[id]; if (x && x.issuedOn) issued.push({ fy: r.fy, q: r.q, ...x }) })
  const keys = [...new Set(ent.map(x => fyOf(x.date) + '|' + quarterOf(x.month)))].sort().reverse()
  const quarters = keys.map(k => {
    const [f, q] = k.split('|'); const es = ent.filter(x => fyOf(x.date) === f && quarterOf(x.month) === +q); const c = issued.find(i => i.fy === f && i.q === +q)
    return { fy: f, q: +q, base: es.reduce((a, x) => a + x.base, 0), tds: es.reduce((a, x) => a + x.tds, 0), issuedOn: c?.issuedOn || null, file: c?.file || null, due: qDue(f, +q, F16_DUE) }
  })
  return ok(res, quarters.length ? `TDS for ${O.name}: ${quarters.length} quarter${quarters.length === 1 ? '' : 's'}.` : `No TDS deducted for ${O.name} yet.`, { ownerId: id, pan: O.pan || '', quarters })
}
