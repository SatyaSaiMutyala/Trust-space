/*
 * Rent schedule of a lease, computed on the server with the shared calculation module (shared/calc/lease.js):
 *   GET /api/leases/:id/schedule       month-by-month rows, lease-year totals, whole-term totals, per-owner split, upfront amounts
 *   GET /api/leases/:id/schedule.csv   the same as a spreadsheet
 * The lease must be one the signed-in user may see (same scope as GET /api/leases/:id).
 */
import { models, toApi } from '../models/index.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { notFound } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { makeCtx, schedule, scheduleCsv, inr } from '../../../shared/calc/index.js'
import { todayIST } from './tdsReport.js'

async function leaseFor(req) {
  const L = await models.leases.findById(req.params.id).lean()
  if (!L || !matches(L, await scopeFilter('leases', req.user))) throw notFound(`No lease found with id “${req.params.id}”. It may have been deleted.`)
  const [owners, props] = await Promise.all([models.owners.find({}).lean(), models.properties.find({}, { code: 1, name: 1 }).lean()])
  return { L: toApi(L), ctx: makeCtx({ today: todayIST(), owners: owners.map(toApi), props: props.map(toApi) }) }
}

export async function leaseSchedule(req, res) {
  const { L, ctx } = await leaseFor(req)
  const sc = schedule(L, ctx)
  return ok(res, sc.rows.length ? `Rent schedule for ${L.ref}: ${sc.tot.months} months, ${inr(sc.tot.rent)} rent over the term.` : `No rent schedule for ${L.ref} yet — it needs a start date, an end date and a rent.`, { leaseId: L.id, ...sc })
}

export async function leaseScheduleCsv(req, res) {
  const { L, ctx } = await leaseFor(req)
  res.type('text/csv').attachment(`${L.ref}-rent-schedule.csv`).send(scheduleCsv(L, ctx))
}
