/*
 * Monthly rent invoices. On the 1st of every month (and on demand from the web), one rent invoice is created for every
 * owner of every active lease (a payment voucher for a co-share, who raises no invoice), from the lease's own rent schedule — escalation, rent-free months, pro-rata months and
 * advance-rent adjustments are already in that schedule (shared/calc). GST, TDS and net payable are then derived the
 * same way as for a hand-made invoice (resources/derive.js), so a generated invoice is identical to one typed in.
 *
 * Idempotent: a lease owner who already has a rent invoice for the month (not rejected) is skipped, so the job can run
 * any number of times. Draft leases, terminated leases and months outside the lease term are skipped too.
 */
import mongoose from 'mongoose'
import { models } from '../models/index.js'
import { makeCtx, schedRow } from '../../../shared/calc/index.js'
import { deriveInvoice } from '../resources/derive.js'
import { newId } from '../utils/ids.js'
import { todayIST } from '../controllers/reportContext.js'
import { env } from '../config/env.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const perLabel = p => `${MONTHS[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`
const perEnd = p => { const d = new Date(Date.UTC(+p.slice(0, 4), +p.slice(5, 7), 0)); return d.toISOString().slice(0, 10) }
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
/** Indian financial year label for a date: 2026-10-01 → "26-27". */
const fyOf = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); const a = m >= 4 ? y : y - 1; return `${String(a).slice(2)}-${String(a + 1).slice(2)}` }

/** Record of each run (one per month), so the scheduler knows what it has done and the web can show "generated on …". */
const runSchema = new mongoose.Schema({ _id: String, period: String, ranAt: String, lastRunAt: String, by: String, lastBy: String, created: Number, skipped: Number, details: mongoose.Schema.Types.Mixed }, { versionKey: false })
export const InvoiceRun = mongoose.models.InvoiceRun || mongoose.model('InvoiceRun', runSchema)

/** The next invoice number for an owner in a financial year: <prefix>/<fy>/<seq>, continuing their own sequence. */
async function nextNumber(owner, date, taken) {
  const prefix = owner?.invPrefix || 'INV'; const fy = fyOf(date); const head = `${prefix}/${fy}/`
  const existing = await models.invoices.find({ ownerId: owner._id, number: new RegExp('^' + head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }, { number: 1 }).setOptions({ withDeleted: true }).lean()
  let seq = existing.reduce((a, i) => Math.max(a, +i.number.slice(head.length) || 0), 0)
  let n; do { seq++; n = head + String(seq).padStart(3, '0') } while (taken.has(n))
  taken.add(n); return n
}

/**
 * Generate the rent invoices of one month. period "YYYY-MM" (default: the current month, IST).
 * Returns { period, created: [{ id, number, leaseRef, owner, net }], skipped: [{ leaseRef, owner?, reason }] }.
 */
export async function generateRentInvoices({ period, by = 'TruSpace', status } = {}) {
  const today = todayIST(); period = period || today.slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('period must look like 2026-11')
  status = status || env.invoices.autoStatus
  const [leases, owners, existing] = await Promise.all([
    models.leases.find({ status: { $ne: 'Draft' }, start: { $lte: perEnd(period) }, end: { $gte: period + '-01' } }).lean(),
    models.owners.find({}).lean(),
    models.invoices.find({ type: 'Rent', period, status: { $ne: 'Rejected' } }, { leaseId: 1, ownerId: 1, number: 1 }).lean(),
  ])
  const ownerById = Object.fromEntries(owners.map(o => [o._id, { ...o, id: o._id }]))
  const ctx = makeCtx({ today, owners: Object.values(ownerById) })
  const have = new Set(existing.map(i => `${i.leaseId}|${i.ownerId}`))
  const taken = new Set(existing.map(i => i.number))
  const created = [], skipped = []
  for (const L of leases) {
    const lease = { ...L, id: L._id }
    if (L.exit && L.exit.stage >= 5) { skipped.push({ leaseRef: L.ref, reason: 'Lease terminated' }); continue }
    if (L.exit && L.exit.effective && L.exit.effective < period + '-01') { skipped.push({ leaseRef: L.ref, reason: `Vacated on ${L.exit.effective}` }); continue }
    const row = schedRow(lease, period, ctx)
    if (!row) { skipped.push({ leaseRef: L.ref, reason: 'Month outside the lease term' }); continue }
    if (!row.ch) { skipped.push({ leaseRef: L.ref, reason: 'Rent-free month' }); continue }
    for (const s of row.split) {
      const O = ownerById[s.ownerId]; const who = O?.name || s.ownerId
      if (!O) { skipped.push({ leaseRef: L.ref, owner: who, reason: 'Owner record missing' }); continue }
      if (have.has(`${L._id}|${s.ownerId}`)) { skipped.push({ leaseRef: L.ref, owner: who, reason: 'Already invoiced' }); continue }
      const base = s.rent - s.adj
      if (base <= 0) { skipped.push({ leaseRef: L.ref, owner: who, reason: 'Fully adjusted against advance rent' }); continue }
      const date = period + '-01'
      const due = row.due && row.due >= date ? row.due : addDays(date, 7)
      const notes = (row.notes || []).filter(n => !/^Rent-free/.test(n))
      const voucher = s.role === 'coShare' // not on the agreement: a rent payment voucher instead of an invoice (no GST, TDS on their PAN)
      const rec = {
        number: await nextNumber(voucher ? { ...O, invPrefix: O.invPrefix || 'PAY' } : O, date, taken), propertyId: L.propertyId, leaseId: L._id, ownerId: s.ownerId, type: 'Rent', period, date, dueDate: due,
        base, gst: voucher ? 0 : s.gst, source: 'Generated', generated: true, voucher, files: [], status,
        desc: `${voucher ? 'Rent share' : 'Rent'} for ${perLabel(period)}${notes.length ? ' · ' + notes.join(' · ') : ''}`,
        log: [{ at: new Date().toISOString(), by, text: `${voucher ? 'Payment voucher generated' : 'Generated'} from the lease schedule for ${perLabel(period)}${status === 'Verified' ? ' · checked against the agreement' : ''}` }],
      }
      const full = await deriveInvoice(rec, null, { models })
      const now = new Date().toISOString()
      const doc = await models.invoices.create({ _id: newId(), ...full, createdAt: now, updatedAt: now })
      have.add(`${L._id}|${s.ownerId}`)
      created.push({ id: doc._id, number: doc.number, leaseRef: L.ref, owner: who, net: doc.net })
    }
  }
  // One record per month: when it was first generated, the last run, and everything created so far (later runs only add the missing ones).
  const prev = await InvoiceRun.findById(`rent-${period}`).lean()
  const now = new Date().toISOString()
  const run = { _id: `rent-${period}`, period, ranAt: prev?.ranAt || now, lastRunAt: now, by: prev?.by || by, lastBy: by, created: (prev?.created || 0) + created.length, skipped: skipped.length, details: { created: [...(prev?.details?.created || []), ...created], skipped } }
  await InvoiceRun.findByIdAndUpdate(run._id, run, { upsert: true })
  return { period, created, skipped, ranAt: run.ranAt, lastRunAt: now }
}

export const lastRun = period => InvoiceRun.findById(`rent-${period || todayIST().slice(0, 7)}`).lean()

/* ---------- scheduler: run once per month, on or after the 1st, catching up after downtime ---------- */
let timer = null
export async function runIfDue() {
  const period = todayIST().slice(0, 7)
  if (await InvoiceRun.exists({ _id: `rent-${period}` })) return null
  const r = await generateRentInvoices({ period, by: 'TruSpace (monthly)' })
  console.log(`Rent invoices for ${perLabel(period)}: ${r.created.length} generated, ${r.skipped.length} skipped`)
  return r
}
/** Checks every hour whether this month's invoices exist; on the 1st (or the first start after it) they are generated. */
export function startInvoiceScheduler() {
  if (!env.invoices.autoGenerate || timer) return
  const tick = () => runIfDue().catch(e => console.error('Rent invoice generation failed:', e.message))
  setTimeout(tick, 15 * 1000) // shortly after start-up (catch-up), then hourly
  timer = setInterval(tick, 60 * 60 * 1000)
  if (timer.unref) timer.unref()
}
export function stopInvoiceScheduler() { if (timer) { clearInterval(timer); timer = null } }
