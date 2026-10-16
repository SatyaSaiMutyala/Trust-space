/* Lease actions and the lease form submit — ported from the prototype (ACT.renewLease/activateLease/schedMode/schedCsv/depAgree/depDecline/depCancel,
   readOwnerRows, ownerSums, leaseFromForm, SUBMIT.lease, SUBMIT.depAdj). */
import { S, UI, prop, owner, save, toast, emit, openDrawer, actor, side } from '../../store/store'
import { newInsp, settleWithDeposit } from '../../store/actions'
import { addDays, addMonths, num, inr, perLabel, newId, nowISO, TODAY } from '../../domain/utils'
import { rentFor, scheduleCsv, leaseOwners, isMulti, depHeld, depAdjs } from '../../domain/lease'
import { inspOf } from '../../domain/inspection'
import { uploadFiles, offerDownload } from '../../services/files'

export function renewLease(id) {
  const L = S.leases.find(l => l.id === id); const start = addDays(L.end, 1)
  openDrawer({ kind: 'lease', renewFrom: Object.assign({}, L, { id: undefined, exit: undefined, docs: [], start, end: addMonths(start, 60), rent: Math.round(rentFor(L, L.end.slice(0, 7)) * 1.05), status: 'Draft', ref: 'TDPL-FAC-LSE-' + String(S.leases.length + 1).padStart(3, '0'), depositPaid: true, clauses: (L.clauses || '') + '\nRenewal of ' + L.ref + '.' }) })
}

export async function activateLease(id) {
  const L = S.leases.find(l => l.id === id); L.status = 'Active'; await save('leases', L)
  const P = prop(L.propertyId); if (P && P.status === 'Pipeline') { P.status = 'Under fit-out'; await save('properties', P, true) }
  if (!inspOf(L.id, 'Move-in')) { toast('Lease active — record the take-over inspection with the owner at possession.', 'warning'); newInsp(L.id, 'Move-in') }
}

export function schedMode(m) { UI.schedMode = m; emit() }

export function schedCsv(id) { const L = S.leases.find(l => l.id === id); offerDownload(`${L.ref}-rent-schedule.csv`, scheduleCsv(L)) }

/** Co-owner rows of the lease form (prototype readOwnerRows). Each row's fields share the names o-id, o-rent, o-maint, o-dep, o-adv, o-gst. */
export function readOwnerRows(f) {
  const fd = new FormData(f); const g = k => fd.getAll(k)
  const ids = g('o-id'), rent = g('o-rent'), maint = g('o-maint'), dep = g('o-dep'), adv = g('o-adv'), gst = g('o-gst')
  return ids.map((id, i) => ({ ownerId: id, rent: num(rent[i]), maint: num(maint[i]), dep: num(dep[i]), adv: num(adv[i]), gst: gst[i] })).filter(o => o.ownerId || o.rent)
}

/** Column totals under the co-owner table (prototype ownerSums): { rent|maint|dep|adv: { text, color } }. */
export function ownerSums(f) {
  const rows = readOwnerRows(f); const out = {}
  ;['rent', 'maint', 'dep', 'adv'].forEach(k => { const t = rows.reduce((a, o) => a + (+o[k] || 0), 0); out[k] = { text: rows.length > 1 ? (Math.round(t * 100) / 100) + '%' : '', color: rows.length > 1 && Math.abs(t - 100) > 0.01 ? 'var(--bad)' : 'var(--muted)' } })
  return out
}

/** Read the lease form into a lease record (prototype leaseFromForm). */
export function leaseFromForm(f, base) {
  const fd = new FormData(f); const P = prop(fd.get('propertyId'))
  return Object.assign({}, base, { ref: fd.get('ref'), propertyId: fd.get('propertyId'), ownerId: base.ownerId || P?.ownerId, start: fd.get('start'), end: fd.get('end'), lockIn: num(fd.get('lockIn')), notice: num(fd.get('notice')), fitout: num(fd.get('fitout')), status: fd.get('status'), rent: num(fd.get('rent')), payTiming: fd.get('payTiming'), dueDay: Math.min(28, num(fd.get('dueDay')) || 5), escPct: num(fd.get('escPct')), escEvery: num(fd.get('escEvery')), escType: fd.get('escType'), escFrom: fd.get('escFrom'), deposit: num(fd.get('deposit')), depositPaid: !!fd.get('depositPaid'), advanceRent: num(fd.get('advanceRent')), advanceMonths: num(fd.get('advanceMonths')), brokerage: num(fd.get('brokerage')), maintType: fd.get('maintType'), maint: num(fd.get('maint')), maintEsc: !!fd.get('maintEsc'), elec: fd.get('elec'), gstMode: fd.get('gstMode'), tds: !!fd.get('tds'), tdsOnMaint: !!fd.get('tdsOnMaint'), registered: !!fd.get('registered'), stamp: num(fd.get('stamp')), clauses: fd.get('clauses') }, (() => { const rows = readOwnerRows(f); if (rows.length > 1) return { owners: rows, ownerId: rows[0].ownerId || base.ownerId, tdsPerOwner: !!fd.get('tdsPerOwner') }; return { owners: undefined, ownerId: (rows[0] && rows[0].ownerId) || base.ownerId || P?.ownerId, tdsPerOwner: undefined } })())
}

/** SUBMIT.lease */
export async function submitLease(f, fd, id) {
  const old = id ? S.leases.find(l => l.id === id) : {}
  const P = prop(fd.get('propertyId'))
  const docs = (old.docs || []).concat(await uploadFiles(fd.getAll('files').filter(x => x.size)))
  const L = leaseFromForm(f, Object.assign({}, old, { ownerId: P?.ownerId || old.ownerId, docs }))
  if (L.end <= L.start) { toast('End date must be after the start date.', 'warning'); return }
  if (L.owners) {
    const ids = L.owners.map(o => o.ownerId); if (ids.some(x => !x)) { toast('Choose an owner on every co-owner row.', 'warning'); return } if (new Set(ids).size !== ids.length) { toast('The same owner is listed twice.', 'warning'); return }
    for (const [k, lbl, need] of [['rent', 'Rent', true], ['maint', 'Maintenance', +L.maint > 0], ['dep', 'Deposit', +L.deposit > 0], ['adv', 'Advance', +L.advanceRent > 0]]) { const t = L.owners.reduce((a, o) => a + (+o[k] || 0), 0); if (need && Math.abs(t - 100) > 0.01) { toast(`${lbl} shares add up to ${Math.round(t * 100) / 100}% — they must total 100%.`, 'warning'); return } }
  }
  if (addDays(L.start, L.fitout) > L.end) { toast('Rent-free period runs past the end of the lease.', 'warning'); return }
  await save('leases', L); openDrawer({ kind: 'leaseView', id: L.id })
}

/* ---------- Security deposit adjusted against rent ---------- */
const adjOf = (leaseId, id) => { const L = S.leases.find(l => l.id === leaseId); return [L, (L.depAdj || []).find(x => x.id === id)] }

/** ACT.depAgree — the owner agrees in TruSpace. */
export async function depAgree(leaseId, id) {
  const [L, a] = adjOf(leaseId, id); a.status = 'Agreed'; a.consent = { how: 'Agreed in TruSpace', on: TODAY, by: actor() }
  await settleWithDeposit(L); await save('leases', L); toast('Agreed — rent for ' + perLabel(a.period) + ' will be settled from the deposit', 'success')
}

/** ACT.depDecline — the owner declines; TrustLab gets a message. */
export function depDecline(leaseId, id) {
  const [L, a] = adjOf(leaseId, id); a.status = 'Declined'; a.declineReason = 'Declined by owner in TruSpace'; save('leases', L)
  save('messages', { propertyId: L.propertyId, ownerId: a.ownerId, from: 'owner', by: actor(), kind: 'Message', text: `I do not agree to adjust the security deposit against rent for ${perLabel(a.period)}. Please pay the rent as usual.`, at: nowISO(), files: [], read: { owner: true } }, true)
}

/** ACT.depCancel — TrustLab withdraws a proposal. */
export async function depCancel(leaseId, id) { const [L, a] = adjOf(leaseId, id); a.status = 'Cancelled'; await save('leases', L) }

/** SUBMIT.depAdj */
export async function submitDepAdj(fd, leaseId) {
  const L = S.leases.find(l => l.id === leaseId); const how = fd.get('how') || 'portal'; const picks = []
  for (const [k] of fd.entries()) { if (!k.startsWith('on_')) continue; const i = k.slice(3); const [period, ownerId, tds] = fd.get('key_' + i).split('|'); const amount = num(fd.get('amt_' + i)); if (amount > 0) picks.push({ period, ownerId, tds: +tds || 0, amount }) }
  if (!picks.length) { toast('Tick at least one month.', 'warning'); return }
  for (const o of leaseOwners(L)) { const want = picks.filter(x => x.ownerId === o.ownerId).reduce((a, x) => a + x.amount, 0); const avail = depHeld(L, o.ownerId) - depAdjs(L, o.ownerId, true).filter(a => a.status === 'Proposed').reduce((a, x) => a + (+x.amount || 0), 0); if (want > avail) { toast(`${isMulti(L) ? (owner(o.ownerId)?.name || '') + '’s' : 'The'} deposit held (${inr(avail)}) is less than ${inr(want)}.`, 'warning'); return } }
  if (how === 'recorded' && !(fd.get('ref') || '').trim()) { toast('Add the reference for the owner’s agreement.', 'warning'); return }
  const consent = how === 'recorded' ? { how: fd.get('how2'), on: fd.get('on'), ref: fd.get('ref'), by: actor() } : null
  L.depAdj = (L.depAdj || []).concat(picks.map(x => Object.assign({ id: newId(), status: consent ? 'Agreed' : 'Proposed', consent, note: fd.get('note') || '', createdAt: nowISO(), createdBy: actor() }, x)))
  if (consent) await settleWithDeposit(L)
  await save('leases', L)
  const byOwner = {}; picks.forEach(x => (byOwner[x.ownerId] = byOwner[x.ownerId] || []).push(x))
  for (const [oid, xs] of Object.entries(byOwner)) await save('messages', { propertyId: L.propertyId, ownerId: oid, from: side(), by: actor(), kind: consent ? 'Notice' : 'Approval request', text: `${consent ? 'As agreed' : 'TrustLab proposes'} to settle rent for ${xs.map(x => perLabel(x.period)).join(', ')} from the security deposit held${isMulti(L) ? ' (your share)' : ''}: ${inr(xs.reduce((a, x) => a + x.amount, 0))} in total, with TDS deducted and deposited as usual. Deposit held after this: ${inr(depHeld(L, oid) - (consent ? 0 : xs.reduce((a, x) => a + x.amount, 0)))}.${consent ? '' : ' Please agree or decline under Lease in your portal.'}`, at: nowISO(), files: [], read: { [side()]: true } }, true)
  toast(consent ? 'Recorded — those months are settled from the deposit' : 'Sent to the owner for agreement', 'success'); openDrawer({ kind: 'leaseView', id: L.id })
}
