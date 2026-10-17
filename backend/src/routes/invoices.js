/* Rent invoice generation (staff and admin):
 *   POST /api/invoices/generate        { period?: "2026-11" }  — generate this (or the given) month's rent invoices now
 *   GET  /api/invoices/generate        ?period=2026-11         — what the last run for that month did
 * Mounted before the generic /api/invoices/:id routes. */
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { generateRentInvoices, lastRun } from '../services/invoiceGenerator.js'
import { ok } from '../utils/respond.js'
import { badRequest } from '../utils/ApiError.js'
import { count } from '../utils/text.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const perLabel = p => `${MONTHS[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`
const router = Router()
const staffOnly = [requireAuth, requireRole('admin', 'staff')] // only these two paths — everything else under /invoices falls through to the generic routes

router.post('/generate', ...staffOnly, async (req, res) => {
  const period = req.body?.period
  if (period !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period))) throw badRequest('The month must look like 2026-11.', { period: 'Use YYYY-MM' })
  const r = await generateRentInvoices({ period, by: req.user.name || req.user.email })
  const msg = r.created.length ? `${count(r.created.length, 'rent invoice', 'rent invoices')} generated for ${perLabel(r.period)}${r.skipped.length ? ` · ${r.skipped.length} skipped` : ''}.` : `Nothing to generate for ${perLabel(r.period)} — ${r.skipped.length ? 'every lease is already invoiced or not due' : 'no active leases'}.`
  return ok(res, msg, r)
})

router.get('/generate', ...staffOnly, async (req, res) => {
  const run = await lastRun(req.query.period)
  return ok(res, run ? `Rent invoices for ${perLabel(run.period)} were generated on ${run.ranAt.slice(0, 10)}.` : 'Not generated yet for this month.', run)
})

export default router
