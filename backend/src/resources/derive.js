/*
 * Server-side derived fields — the API is the source of truth for money. Runs after validation on create, replace and
 * patch (see controllers/crud.js). Each derive(rec, existing, { models }) returns the record to store.
 *
 * Invoices: GST, RCM, TDS, total and net payable are recomputed from the lease and the owner with the shared
 * calculation module (shared/calc — the same code the web app uses for its previews), whatever the client sent.
 * They are recomputed when the invoice is new or any of its inputs changed; a change of status alone (verify,
 * approve, pay) keeps the stored amounts, so history never shifts because an owner's PAN or lease was edited later.
 */
import { makeCtx, calc, schedRow, depHeld } from '../../../shared/calc/index.js'

const INPUTS = ['leaseId', 'ownerId', 'type', 'period', 'base']
const gstFlag = r => Number(r.gst) > 0 // the "Charge GST 18%" tick on the invoice form arrives as a non-zero gst
const sameInputs = (a, b) => INPUTS.every(k => String(a[k] ?? '') === String(b[k] ?? '')) && gstFlag(a) === gstFlag(b)

export async function deriveInvoice(rec, existing, { models }) {
  if (!rec.leaseId || !rec.ownerId) return rec
  // inputs unchanged: keep the stored amounts (server-computed, or as recorded before this rule existed) — never the ones the client sent
  if (existing && sameInputs(rec, existing)) return { ...rec, voucher: !!existing.voucher, base: existing.base, gst: existing.gst, rcm: existing.rcm, tds: existing.tds, tdsRate: existing.tdsRate, total: existing.total, net: existing.net, computedBy: existing.computedBy }
  const [L, O] = await Promise.all([models.leases.findById(rec.leaseId).lean(), models.owners.findById(rec.ownerId).lean()])
  if (!L) return rec
  const lease = { ...L, id: L._id }; const owner = O ? { ...O, id: O._id } : undefined
  const ctx = makeCtx({ today: new Date().toISOString().slice(0, 10), ownerOf: () => owner })
  const voucher = owner?.party === 'Co-share' // a co-share raises no invoice: this record is their rent payment voucher, never with GST
  const gstOn = gstFlag(rec) && !!owner?.gstin && !voucher // GST can only be charged by a registered owner
  const c = calc(lease, rec.type, rec.base, rec.period, gstOn, rec.ownerId, ctx)
  return { ...rec, voucher, base: c.base, gst: voucher ? 0 : c.gst, rcm: voucher ? 0 : c.rcm, tds: c.tds, tdsRate: c.tdsRate, total: c.base + (voucher ? 0 : c.gst), net: c.base + (voucher ? 0 : c.gst) - c.tds, computedBy: 'server' }
}

/** Deposit adjustments on a lease: the TDS of a new or changed adjustment is what the rent invoice (or, without one, the
 *  schedule) says for that month and owner — the agreed amount itself is the owner's and TrustLab's to set. */
/** Split rows follow the owner records: an owner with party 'Co-share' is role coShare with no GST, everyone else role owner.
 *  Applied to the current split and to the history, so the client can never store a co-share with GST. */
async function normaliseSplit(rec, models) {
  const lists = [rec.owners, ...((Array.isArray(rec.ownerHistory) ? rec.ownerHistory : []).map(h => h && h.owners))].filter(Array.isArray)
  const ids = [...new Set(lists.flat().map(o => o && o.ownerId).filter(Boolean))]
  if (!ids.length) return rec
  const owners = await models.owners.find({ _id: { $in: ids } }, { party: 1 }).lean()
  const coShare = new Set(owners.filter(o => o.party === 'Co-share').map(o => o._id))
  const fix = o => (o && o.ownerId ? (coShare.has(o.ownerId) ? { ...o, role: 'coShare', gst: 'None' } : (o.role === 'coShare' ? { ...o, role: 'owner' } : o)) : o)
  return { ...rec, ...(Array.isArray(rec.owners) ? { owners: rec.owners.map(fix) } : {}), ...(Array.isArray(rec.ownerHistory) ? { ownerHistory: rec.ownerHistory.map(h => (h && Array.isArray(h.owners) ? { ...h, owners: h.owners.map(fix) } : h)) } : {}) }
}

export async function deriveLease(rec, existing, { models }) {
  rec = await normaliseSplit(rec, models)
  if (rec.exit && Array.isArray(rec.exit.deductions) && rec.exit.stage >= 4) rec = { ...rec, exit: { ...rec.exit, refund: depHeld(rec) - rec.exit.deductions.reduce((s, d) => s + (+d.amount || 0), 0) } }
  if (!Array.isArray(rec.depAdj) || !rec.depAdj.length) return rec
  const before = new Map(((existing && existing.depAdj) || []).map(a => [a.id, a]))
  const changed = rec.depAdj.filter(a => { const b = a.id && before.get(a.id); return !b || b.period !== a.period || b.ownerId !== a.ownerId || Number(b.amount) !== Number(a.amount) })
  if (!changed.length) return rec
  const [owners, invoices] = await Promise.all([models.owners.find({}).lean(), models.invoices.find({ leaseId: rec.id || existing?._id, type: 'Rent', status: { $ne: 'Rejected' } }).lean()])
  const ctx = makeCtx({ today: new Date().toISOString().slice(0, 10), owners: owners.map(o => ({ ...o, id: o._id })) })
  const lease = { ...rec, id: rec.id || existing?._id }
  const depAdj = rec.depAdj.map(a => {
    if (!changed.includes(a)) return a
    const inv = invoices.find(i => i.period === a.period && (i.ownerId || lease.ownerId) === a.ownerId)
    if (inv) return { ...a, tds: +inv.tds || 0 }
    const x = schedRow(lease, a.period, ctx)?.split?.find(s => s.ownerId === a.ownerId)
    return { ...a, tds: x && x.tdsOn ? Math.round((x.rent - x.adj) * x.tdsRate / 100) : 0 }
  })
  return { ...rec, depAdj }
}

export const DERIVE = { invoices: deriveInvoice, leases: deriveLease }
