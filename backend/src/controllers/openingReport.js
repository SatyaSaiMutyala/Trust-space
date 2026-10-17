/*
 * Opening balances (dues to owners outstanding when TruSpace went live), computed on the server with shared/calc:
 *   GET /api/opening                                   every lease that started before the go-live date: its month items with
 *                                                      what is still outstanding, per-lease and overall totals
 *   GET /api/leases/:id/opening-fill?from=YYYY-MM      rent months from the schedule to pre-fill the opening-balance form
 *   GET /api/leases/:id/opening-pay/:itemId            suggested amount transferred and TDS for recording a payment
 * Owners see their own items only.
 */
import { badRequest, notFound } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { reportContext } from './reportContext.js'
import { OB_DATE, obItems, obOut, schedRow, tdsRate, panValid, perAdd, inr } from '../../../shared/calc/index.js'

const PERIOD = /^\d{4}-\d{2}$/
const withOut = it => ({ ...it, out: obOut(it) })

export async function opening(req, res) {
  const R = await reportContext(req.user)
  const leases = R.leases.filter(L => L.status !== 'Draft' && L.start < OB_DATE).map(L => {
    const items = obItems(L, null, R.me).sort((a, b) => a.period.localeCompare(b.period)).map(withOut)
    return { leaseId: L.id, propertyId: L.propertyId, ref: L.ref, entered: !!L.opening, confirmed: !!L.opening?.confirmed, confirmedOn: L.opening?.confirmedOn || null, items, total: items.reduce((a, it) => a + (+it.amount || 0), 0), outstanding: items.reduce((a, it) => a + it.out, 0) }
  })
  const all = leases.flatMap(l => l.items)
  const totals = { due: all.reduce((a, it) => a + (+it.amount || 0), 0), paid: all.reduce((a, it) => a + (+it.paidAmount || 0) + (+it.tds || 0), 0), outstanding: all.reduce((a, it) => a + it.out, 0), entries: all.length, outEntries: all.filter(it => it.out).length, confirmedLeases: leases.filter(l => l.confirmed).length, leases: leases.length }
  return ok(res, totals.outstanding ? `Opening balances: ${inr(totals.outstanding)} still outstanding across ${totals.outEntries} month entr${totals.outEntries === 1 ? 'y' : 'ies'}.` : 'Opening balances: nothing outstanding.', { asOf: OB_DATE, today: R.today, leases, totals })
}

async function leaseOf(R, id) {
  const L = R.leases.find(l => l.id === id)
  if (!L) throw notFound(`No lease found with id “${id}”. It may have been deleted.`)
  return L
}

/** Rent months from the schedule between `from` and the month before go-live (prototype ACT.obFill); the client drops the ones already listed. */
export async function openingFill(req, res) {
  const R = await reportContext(req.user); const L = await leaseOf(R, req.params.id)
  const from = req.query.from || L.start.slice(0, 7)
  if (!PERIOD.test(from)) throw badRequest('“from” should be a month like 2026-01.', { from: 'Bad format' })
  const end = perAdd(OB_DATE.slice(0, 7), -1); const items = []
  for (let p = from; p <= end; p = perAdd(p, 1)) {
    const r = schedRow(L, p, R.ctx); if (!r) continue
    r.split.forEach(x => { const rr = x.rent - x.adj; if (rr <= 0) return; const gross = rr + (x.mode === 'Forward' ? Math.round(rr * 0.18) : 0); items.push({ period: p, type: 'Rent', ownerId: x.ownerId, amount: gross, note: 'From rent schedule' }) })
  }
  return ok(res, items.length ? `${items.length} rent month${items.length === 1 ? '' : 's'} from the schedule.` : 'Nothing to add for that period.', { leaseId: L.id, from, items })
}

/** What recording a payment should default to: the TDS the lease calls for on that month's rent, and the balance to transfer. */
export async function openingPay(req, res) {
  const R = await reportContext(req.user); const L = await leaseOf(R, req.params.id)
  const it = obItems(L).find(x => x.id === req.params.itemId)
  if (!it) throw notFound(`No opening-balance entry “${req.params.itemId}” on lease ${L.ref}.`)
  const x = schedRow(L, it.period, R.ctx)?.split?.find(s => s.ownerId === it.ownerId)
  const date = it.paidOn || R.today; const rate = tdsRate(it.ownerId, date, R.ctx)
  const tds = it.type === 'Rent' && x?.tdsOn ? Math.round((+it.amount || 0) / (x.mode === 'Forward' ? 1.18 : 1) * rate / 100) : 0
  return ok(res, tds ? `TDS ${inr(tds)} at ${rate}% on the rent.` : 'No TDS applies to this entry.', { leaseId: L.id, itemId: it.id, rate, tds, paid: (+it.amount || 0) - tds, noPan: !panValid(R.ctx.ownerOf(it.ownerId)) })
}
