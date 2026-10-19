/*
 * Security deposits, computed on the server with shared/calc:
 *   GET /api/leases/:id/deposit   deposit held / adjusted per owner, the unpaid rent months that could be settled from it,
 *                                 and the exit settlement (refund due per owner after deductions)
 *   GET /api/deposits             deposit held across the running leases the user may see (overview figure)
 */
import { notFound } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { reportContext } from './reportContext.js'
import { depositOwners, isMulti, splitAmt, depAdjs, depShareAmt, depAdjusted, depHeld, depAdjCandidates, invState, leaseState, inr } from '../../../shared/calc/index.js'

export async function leaseDeposit(req, res) {
  const R = await reportContext(req.user)
  const L = R.leases.find(l => l.id === req.params.id)
  if (!L) throw notFound(`No lease found with id “${req.params.id}”. It may have been deleted.`)
  const os = depositOwners(L)
  const owners = os.map(o => {
    const held = depHeld(L, o.ownerId); const proposed = depAdjs(L, o.ownerId, true).filter(a => a.status === 'Proposed').reduce((s, a) => s + (+a.amount || 0), 0)
    return { ownerId: o.ownerId, sharePct: +o.dep || 0, share: depShareAmt(L, o.ownerId), adjusted: depAdjusted(L, o.ownerId), held, proposed, available: held - proposed }
  })
  const candidates = depAdjCandidates(L, R.ctx).map(c => { const inv = c.inv ? R.invoices.find(i => i.id === c.inv) : null; return { ...c, invState: inv ? invState(inv, R.today) : null } })
  const x = L.exit || {}; const ded = (x.deductions || []).reduce((a, d) => a + (+d.amount || 0), 0); const dedS = splitAmt(ded, os, 'dep')
  const settlement = { deductions: ded, refund: depHeld(L) - ded, rows: os.map((o, i) => ({ ownerId: o.ownerId, dep: depHeld(L, o.ownerId), ded: dedS[i], due: depHeld(L, o.ownerId) - dedS[i] })) }
  const data = { leaseId: L.id, deposit: +L.deposit || 0, paid: !!L.depositPaid, multi: isMulti(L), adjusted: depAdjusted(L), held: depHeld(L), owners, candidates, settlement }
  return ok(res, `Deposit on ${L.ref}: ${inr(data.held)} held of ${inr(data.deposit)}${candidates.length ? ` · ${candidates.length} rent month${candidates.length === 1 ? '' : 's'} could be settled from it` : ''}.`, data)
}

export async function deposits(req, res) {
  const R = await reportContext(req.user)
  const leases = R.leases.filter(l => l.depositPaid && leaseState(l, R.today) !== 'Terminated').map(l => ({ leaseId: l.id, propertyId: l.propertyId, deposit: +l.deposit || 0, adjusted: depAdjusted(l), held: depHeld(l) }))
  const held = leases.reduce((a, l) => a + l.held, 0)
  return ok(res, `${inr(held)} of security deposits held across ${leases.length} lease${leases.length === 1 ? '' : 's'}.`, { held, leases })
}
