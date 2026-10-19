/*
 * Owner self-service for the phone app. Mounted on /api/mobile.
 *   GET  /invoice-defaults?propertyId&type&period   number, lease, schedule amount, GST/TDS preview for a new invoice
 *   GET  /deposit-requests                           deposit adjustments proposed to this owner (rent settled from the deposit)
 *   POST /deposit-requests/:leaseId/:adjId/agree     the owner agrees (invoices for those months are marked paid from the deposit)
 *   POST /deposit-requests/:leaseId/:adjId/decline   the owner declines, with a message to the facilities team
 */
import { models, toApi } from '../models/index.js'
import { ok } from '../utils/respond.js'
import { ApiError, notFound, badRequest } from '../utils/ApiError.js'
import { reportContext, todayIST } from './reportContext.js'
import { newId } from '../utils/ids.js'
import { notify } from '../services/notify.js'
import { leaseOwners, depositOwners, isMulti, schedRow, rentFor, ownerShare, calc, fy, perLabel, perAdd, inr, depShareAmt, depAdjusted, depHeld, depAdjs, invState } from '../../../shared/calc/index.js'

const INV_TYPES = ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other']
const latestLease = (R, pid) => R.leases.filter(l => l.propertyId === pid).sort((a, b) => b.start.localeCompare(a.start))[0]

export async function invoiceDefaults(req, res) {
  const R = await reportContext(req.user)
  const { propertyId, type = 'Rent', period } = req.query
  const P = R.props.find(p => p.id === propertyId)
  if (!P) throw notFound(`No property found with id “${propertyId}”.`)
  if (!INV_TYPES.includes(type)) throw badRequest(`Invoice type must be one of ${INV_TYPES.join(', ')}.`)
  const per = /^\d{4}-\d{2}$/.test(String(period || '')) ? period : R.today.slice(0, 7)
  const L = latestLease(R, P.id)
  if (!L) throw badRequest('This property has no lease yet, so no invoice can be raised against it.')
  const oid = req.user.role === 'owner' ? req.user.ownerId : (req.query.ownerId || L.ownerId)
  const O = R.owners.find(o => o.id === oid)
  if (!leaseOwners(L, per).some(o => o.ownerId === oid)) throw new ApiError(403, `You are not an owner on this lease for ${perLabel(per)}.`, { code: 'forbidden' })
  const row = schedRow(L, per, R.ctx); const x = row?.split?.find(s => s.ownerId === oid)
  const base = type === 'Rent' ? (x ? x.rent - x.adj : Math.round(rentFor(L, per) * ownerShare(L, oid, 'rent', per))) : type === 'Maintenance' ? (x ? x.maint : Math.round((+L.maint || 0) * ownerShare(L, oid, 'maint', per))) : 0
  const seq = R.invoices.filter(i => i.ownerId === oid && fy(i.date) === fy(R.today)).length + 1
  const number = `${O?.invPrefix || 'INV'}/${fy(R.today)}/${String(seq).padStart(3, '0')}`
  const dup = R.invoices.find(i => i.leaseId === L.id && i.ownerId === oid && i.type === type && i.period === per && i.status !== 'Rejected')
  const lastElec = R.invoices.filter(i => i.leaseId === L.id && i.type === 'Electricity' && i.reading?.close).sort((a, b) => b.period.localeCompare(a.period))[0]
  const c = calc(L, type, base, per, undefined, oid, R.ctx)
  const months = []; for (let k = 0; k < 6; k++) { const p = perAdd(R.today.slice(0, 7), -k); if (p >= L.start.slice(0, 7)) months.push(p) }
  return ok(res, dup ? `${type} for ${perLabel(per)} already exists (${dup.number}, ${invState(dup, R.today)}).` : `Defaults for ${type.toLowerCase()} ${perLabel(per)} loaded.`, {
    leaseId: L.id, leaseRef: L.ref, ownerId: oid, number, period: per, base, months, gstAllowed: c.mode === 'Forward' && type !== 'Electricity' && !!O?.gstin, mode: c.mode, tdsRate: c.tdsRate, preview: c,
    note: row?.notes?.join(' · ') || '', multi: isMulti(L), share: ownerShare(L, oid, 'rent', per) * 100, meter: P.meter || '', lastReading: lastElec?.reading?.close ?? null, rate: lastElec?.reading?.rate ?? 9.35, fixed: lastElec?.reading?.fixed ?? 0,
    duplicate: dup ? { id: dup.id, number: dup.number, status: invState(dup, R.today) } : null, dueDay: L.dueDay || 5,
  })
}

/** Figures for one proposal, from the owner's side. */
function requestView(R, L, a, P) {
  const me = a.ownerId; const os = depositOwners(L)
  const share = depShareAmt(L, me); const usedAgreed = depAdjusted(L, me); const held = depHeld(L, me)
  const x = L.exit || {}; const ded = (x.deductions || []).reduce((s, d) => s + (+d.amount || 0), 0)
  const idx = os.findIndex(o => o.ownerId === me); const dedShare = idx < 0 ? 0 : Math.round(ded * (+os[idx].dep || 0) / 100)
  const afterThis = held - (+a.amount || 0)
  const others = (L.depAdj || []).filter(b => b.period === a.period && b.ownerId !== me && !['Cancelled'].includes(b.status)).map(b => ({ ownerId: b.ownerId, name: R.owners.find(o => o.id === b.ownerId)?.name || '', status: b.status }))
  const inv = R.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && (i.ownerId || L.ownerId) === me && i.status !== 'Rejected')
  return {
    id: a.id, leaseId: L.id, leaseRef: L.ref, propertyId: P?.id, propertyName: P?.name || '', period: a.period, periodLabel: perLabel(a.period), amount: +a.amount || 0, tds: +a.tds || 0, status: a.status, note: a.note || '', createdAt: a.createdAt, consent: a.consent || null,
    noticeServed: !!x.noticeDate, vacateBy: x.effective || null, multi: isMulti(L),
    deposit: { share, usedAgreed, usedThis: a.status === 'Agreed' ? 0 : +a.amount || 0, held, afterThis, damage: dedShare, refund: Math.max(0, afterThis - dedShare), staysPct: share ? Math.max(0, Math.min(1, afterThis / share)) : 0 },
    invoice: inv ? { id: inv.id, number: inv.number, status: invState(inv, R.today), net: inv.net } : null,
    parties: [{ ownerId: me, name: 'You', status: a.status }].concat(others),
  }
}

export async function depositRequests(req, res) {
  const R = await reportContext(req.user)
  const me = req.user.role === 'owner' ? req.user.ownerId : null
  const out = []
  for (const L of R.leases) {
    const P = R.props.find(p => p.id === L.propertyId)
    for (const a of L.depAdj || []) { if (me && a.ownerId !== me) continue; if (a.status === 'Cancelled') continue; out.push(requestView(R, L, a, P)) }
  }
  out.sort((a, b) => (a.status === 'Proposed' ? 0 : 1) - (b.status === 'Proposed' ? 0 : 1) || b.period.localeCompare(a.period))
  const open = out.filter(r => r.status === 'Proposed').length
  return ok(res, open ? `${open} request${open === 1 ? '' : 's'} waiting for your answer.` : out.length ? 'No requests waiting.' : 'No deposit requests.', out)
}

async function loadReq(req) {
  const R = await reportContext(req.user)
  const L = R.leases.find(l => l.id === req.params.leaseId)
  if (!L) throw notFound(`No lease found with id “${req.params.leaseId}”.`)
  const a = (L.depAdj || []).find(x => x.id === req.params.adjId)
  if (!a) throw notFound('This deposit request no longer exists.')
  if (req.user.role !== 'owner' || a.ownerId !== req.user.ownerId) throw new ApiError(403, 'Only the owner it was sent to can answer this request.', { code: 'forbidden' })
  if (a.status !== 'Proposed') throw new ApiError(409, `This request is already ${a.status.toLowerCase()}.`, { code: 'wrong_state' })
  return { R, L, a, P: R.props.find(p => p.id === L.propertyId) }
}
const now = () => new Date().toISOString()

export async function depositAgree(req, res) {
  const { R, L, a, P } = await loadReq(req)
  const today = todayIST()
  a.status = 'Agreed'; a.consent = { how: 'Agreed in TruSpace app', on: today, by: req.user.name || 'Owner' }
  // settle the rent invoice for that month from the deposit, as the web does
  const inv = R.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && (i.ownerId || L.ownerId) === a.ownerId && !['Paid', 'Rejected'].includes(i.status))
  if (inv && (+a.amount || 0) + 1 >= inv.net) {
    const log = (inv.log || []).concat({ at: now(), by: req.user.name || 'Owner', text: `Settled from security deposit (${inr(inv.net)}) — agreed in TruSpace app` })
    await models.invoices.updateOne({ _id: inv.id }, { $set: { status: 'Paid', paidBy: 'Deposit', paidDate: a.period + '-01' > today ? today : today, paidAmount: inv.net, tdsDeducted: inv.tds, utr: 'Deposit adjustment', log, updatedAt: now() } })
  }
  await models.leases.updateOne({ _id: L.id }, { $set: { depAdj: L.depAdj, updatedAt: now() } })
  notify.leaseSaved({ depAdj: [{ ...a, status: 'Proposed' }] }, L, req.user)
  return ok(res, `Agreed — rent for ${perLabel(a.period)} is settled from your deposit.`, requestView(await reportContext(req.user), { ...L }, a, P))
}

export async function depositDecline(req, res) {
  const { L, a, P } = await loadReq(req)
  const why = String(req.body?.reason || '').trim()
  a.status = 'Declined'; a.declineReason = why ? `Declined by owner in TruSpace app: ${why}` : 'Declined by owner in TruSpace app'
  await models.leases.updateOne({ _id: L.id }, { $set: { depAdj: L.depAdj, updatedAt: now() } })
  notify.leaseSaved({ depAdj: [{ ...a, status: 'Proposed' }] }, L, req.user)
  await models.messages.create({ _id: newId(), propertyId: L.propertyId, ownerId: a.ownerId, from: 'owner', by: req.user.name || 'Owner', kind: 'Message', text: `I do not agree to adjust the security deposit against rent for ${perLabel(a.period)}. Please pay the rent as usual.${why ? ` ${why}` : ''}`, at: now(), files: [], read: { owner: true }, createdAt: now(), updatedAt: now() })
  return ok(res, 'Declined. The facilities team will pay the rent as usual.', requestView(await reportContext(req.user), L, a, P))
}
