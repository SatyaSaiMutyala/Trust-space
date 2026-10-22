/* Lease actions and the lease form submit — ported from the prototype (ACT.renewLease/activateLease/schedMode/schedCsv/depAgree/depDecline/depCancel,
   readOwnerRows, ownerSums, leaseFromForm, SUBMIT.lease, SUBMIT.depAdj). */
import { S, UI, prop, owner, save, toast, emit, openDrawer, closeDrawer, actor, side } from '../../store/store'
import { newInsp, settleWithDeposit } from '../../store/actions'
import { addDays, addMonths, num, inr, perLabel, perAdd, newId, nowISO, TODAY, fmtD } from '../../domain/utils'
import { rentFor, leaseOwners, depositOwners, isMulti, splitAmt, isCoShareOwner } from '../../domain/lease'
import { callApi } from '../../app/store'
import { inspOf } from '../../domain/inspection'
import { offerDownload, uploadFiles } from '../../services/files'

export function renewLease(id) {
  const L = S.leases.find(l => l.id === id); const start = addDays(L.end, 1)
  openDrawer({ kind: 'lease', renewFrom: Object.assign({}, L, { id: undefined, exit: undefined, docs: [], start, end: addMonths(start, 60), rent: Math.round(rentFor(L, L.end.slice(0, 7)) * 1.05), status: 'Draft', ref: 'TDPL-FAC-LSE-' + String(S.leases.length + 1).padStart(3, '0'), depositPaid: true, clauses: (L.clauses || '') + '\nRenewal of ' + L.ref + '.' }) })
}

/** Extend a lease (same agreement, addendum): new end date, optionally a revised rent from the day after the old end,
 *  the addendum reference and file. Recorded in L.extensions; invoices already raised are untouched. */
/** Rent changes rows of the lease form: [{ id, from, kind, value }] (fields rs-id, rs-from, rs-kind, rs-value, one per row). */
export function readRentSteps(fd) {
  const g = k => fd.getAll(k); const ids = g('rs-id'), from = g('rs-from'), kind = g('rs-kind'), value = g('rs-value'), every = g('rs-every'), until = g('rs-until')
  return ids.map((id, i) => ({ id: id || newId(), from: from[i] || '', kind: kind[i] || 'pct', value: num(value[i]), every: num(every[i]), until: until[i] || '' })).filter(s => s.from || s.value)
}

export async function submitExtension(id, fd) {
  const L = S.leases.find(l => l.id === id); if (!L) return
  const end = fd.get('end'); const rentRaw = (fd.get('rent') || '').trim(); const rent = rentRaw ? num(rentRaw) : null; const ref = (fd.get('ref') || '').trim()
  if (!end || end <= L.end) { toast(`The new end date must be after the current end, ${fmtD(L.end)}.`, 'warning'); return }
  if (rentRaw && !(rent > 0)) { toast('Enter the revised monthly rent, or leave it blank to keep the current schedule.', 'warning'); return }
  const fl = fd.get('file'); const up = fl && fl.size ? await uploadFiles([fl], 1) : []
  const file = up[0] ? { ...up[0], name: ref ? `${ref} — ${up[0].name}` : up[0].name } : null
  const ext = { id: newId(), at: nowISO(), by: actor(), fromEnd: L.end, toEnd: end, rent, rentFrom: addDays(L.end, 1), ref, file }
  const next = { ...L, end, extensions: [...(L.extensions || []), ext], docs: file ? [...(L.docs || []), file] : L.docs || [] }
  await save('leases', next)
  closeDrawer()
}

export async function activateLease(id) {
  const L = S.leases.find(l => l.id === id); L.status = 'Active'; await save('leases', L)
  const P = prop(L.propertyId); if (P && P.status === 'Pipeline') { P.status = 'Under fit-out'; await save('properties', P, true) }
  if (!inspOf(L.id, 'Move-in')) { toast('Lease active — record the take-over inspection with the owner at possession.', 'warning'); newInsp(L.id, 'Move-in') }
}

export function schedMode(m) { UI.schedMode = m; emit() }

export async function schedCsv(id) { const L = S.leases.find(l => l.id === id); try { offerDownload(`${L.ref}-rent-schedule.csv`, await callApi('leaseScheduleCsv', id)) } catch (e) { toast(e.message, 'error') } }

/*
 * Co-owner shares are ENTERED as ₹ amounts per column (rent, maintenance, deposit, advance) but STORED as % shares on the
 * lease (`owners[].rent/maint/dep/adv`), which the schedule, invoices and the API work with. The form's column totals are
 * the lease's own monthly rent, maintenance, security deposit and advance rent.
 */
export const SHARE_KEYS = ['rent', 'maint', 'dep', 'adv']
const TOTAL_FIELD = { rent: 'rent', maint: 'maint', dep: 'deposit', adv: 'advanceRent' }
export const SHARE_LABEL = { rent: 'Rent', maint: 'Maintenance', dep: 'Deposit', adv: 'Advance' }
const pct4 = v => Math.round(v * 10000) / 10000

/** The lease's own totals the owners' amounts must add up to. */
export function formTotals(f) { const o = {}; SHARE_KEYS.forEach(k => { o[k] = num(f.elements[TOTAL_FIELD[k]]?.value) }); return o }
/** Field name of each total (rent → "rent", dep → "deposit"…). */
export const totalFieldOf = k => TOTAL_FIELD[k]

/** Owner rows as entered: [{ ownerId, rent, maint, dep, adv (₹), gst }]. Each row's fields share the names o-id, o-rent, o-maint, o-dep, o-adv, o-gst. */
export function readOwnerAmounts(f) {
  const fd = new FormData(f); const g = k => fd.getAll(k)
  const ids = g('o-id'), rent = g('o-rent'), maint = g('o-maint'), dep = g('o-dep'), adv = g('o-adv'), gst = g('o-gst')
  return ids.map((id, i) => ({ ownerId: id, rent: num(rent[i]), maint: num(maint[i]), dep: num(dep[i]), adv: num(adv[i]), gst: gst[i] })).filter(o => o.ownerId || o.rent)
}

/** % shares from amounts in one column; the last owner takes the rounding so the column is exactly 100. A column with no total follows the rent split. */
function sharesOf(rows, k, total, fallback) {
  if (!(total > 0)) return fallback || rows.map(() => pct4(100 / rows.length))
  const out = rows.map(o => pct4((+o[k] || 0) / total * 100))
  const sum = rows.reduce((a, o) => a + (+o[k] || 0), 0)
  if (Math.abs(sum - total) < 0.5 && out.length) out[out.length - 1] = pct4(100 - out.slice(0, -1).reduce((a, x) => a + x, 0))
  return out
}

/** Co-owner rows as stored on the lease (prototype readOwnerRows): amounts turned into % shares of the form's totals. */
export function readOwnerRows(f) {
  const rows = readOwnerAmounts(f); if (!rows.length) return rows
  const T = formTotals(f); const rentP = sharesOf(rows, 'rent', T.rent)
  const P = { rent: rentP }; ['maint', 'dep', 'adv'].forEach(k => { P[k] = sharesOf(rows, k, T[k], rentP) })
  return rows.map((o, i) => (isCoShareOwner(owner(o.ownerId)) ? { ownerId: o.ownerId, rent: P.rent[i], maint: P.maint[i], dep: P.dep[i], adv: P.adv[i], gst: 'None', role: 'coShare' } : { ownerId: o.ownerId, rent: P.rent[i], maint: P.maint[i], dep: P.dep[i], adv: P.adv[i], gst: o.gst }))
}

/** ₹ amounts for each owner from % shares (existing lease → form). */
export function amountsFromShares(owners, T) {
  const per = {}; SHARE_KEYS.forEach(k => { per[k] = splitAmt(Math.round(T[k] || 0), owners, k) })
  return owners.map((o, i) => ({ ...o, rent: per.rent[i], maint: per.maint[i], dep: per.dep[i], adv: per.adv[i] }))
}

/** Column totals under the co-owner table (prototype ownerSums): { rent|maint|dep|adv: { text, color } } — "₹x of ₹y", red when they differ. */
export function ownerSums(f) {
  const rows = readOwnerAmounts(f); const T = formTotals(f); const out = {}
  SHARE_KEYS.forEach(k => { const t = rows.reduce((a, o) => a + (+o[k] || 0), 0); const off = Math.abs(t - T[k]) >= 1; out[k] = { text: rows.length > 1 ? `${inr(t)} of ${inr(T[k])}` : '', color: rows.length > 1 && off ? 'var(--bad)' : 'var(--muted)' } })
  return out
}

/** Read the lease form into a lease record (prototype leaseFromForm). */
export function leaseFromForm(f, base) {
  const fd = new FormData(f); const P = prop(fd.get('propertyId'))
  return Object.assign({}, base, { ref: fd.get('ref'), propertyId: fd.get('propertyId'), ownerId: base.ownerId || P?.ownerId, start: fd.get('start'), end: fd.get('end'), lockIn: num(fd.get('lockIn')), lockInLessor: num(fd.get('lockInLessor')), notice: num(fd.get('notice')), noticeLessor: num(fd.get('noticeLessor')), fitout: num(fd.get('fitout')), status: fd.get('status'), rent: num(fd.get('rent')), payTiming: fd.get('payTiming'), dueDay: Math.min(28, num(fd.get('dueDay')) || 5), rentSteps: readRentSteps(fd), escPct: fd.get('escType') === 'Amount' ? 0 : num(fd.get('escPct')), escAdd: fd.get('escType') === 'Amount' ? num(fd.get('escAdd')) : 0, stepKind: fd.get('stepKind') || 'amt', stepValue: num(fd.get('stepValue')), stepAt: Math.max(1, num(fd.get('stepAt')) || 1), stepOn: fd.get('stepOn') || 'compound', escEvery: num(fd.get('escEvery')), escType: fd.get('escType'), escFrom: fd.get('escFrom'), deposit: num(fd.get('deposit')), depositPaid: !!fd.get('depositPaid'), depositUtr: (fd.get('depositUtr') || '').trim().toUpperCase(), depositChannel: fd.get('depositChannel') || '', depositBank: (fd.get('depositBank') || '').trim(), advanceRent: num(fd.get('advanceRent')), advanceMonths: num(fd.get('advanceMonths')), brokerage: num(fd.get('brokerage')), maintType: fd.get('maintType'), maint: num(fd.get('maint')), maintEsc: !!fd.get('maintEsc'), elec: fd.get('elec'), gstMode: fd.get('gstMode'), tds: !!fd.get('tds'), tdsOnMaint: !!fd.get('tdsOnMaint'), registered: !!fd.get('registered'), stamp: num(fd.get('stamp')), clauses: fd.get('clauses') }, (() => { const rows = readOwnerRows(f); if (rows.length > 1) return { owners: rows, ownerId: rows[0].ownerId || base.ownerId, tdsPerOwner: !!fd.get('tdsPerOwner') }; return { owners: undefined, ownerId: (rows[0] && rows[0].ownerId) || base.ownerId || P?.ownerId, tdsPerOwner: undefined } })())
}

/** SUBMIT.lease */
export async function submitLease(f, fd, id) {
  const old = id ? S.leases.find(l => l.id === id) : {}
  const P = prop(fd.get('propertyId'))
  const L = leaseFromForm(f, Object.assign({}, old, { ownerId: P?.ownerId || old.ownerId })) // agreement documents are no longer attached to the lease form
  if (L.end <= L.start) { toast('End date must be after the start date.', 'warning'); return }
  if (L.owners) {
    const ids = L.owners.map(o => o.ownerId); if (ids.some(x => !x)) { toast('Choose an owner on every co-owner row.', 'warning'); return } if (new Set(ids).size !== ids.length) { toast('The same owner is listed twice.', 'warning'); return }
    const A = readOwnerAmounts(f); const T = formTotals(f)
    for (const [k, need] of [['rent', true], ['maint', +L.maint > 0], ['dep', +L.deposit > 0], ['adv', +L.advanceRent > 0]]) { const t = A.reduce((a, o) => a + (+o[k] || 0), 0); if (need && Math.abs(t - T[k]) >= 1) { toast(`${SHARE_LABEL[k]} amounts add up to ${inr(t)} — they must total ${inr(T[k])}.`, 'warning'); return } }
  }
  if (addDays(L.start, L.fitout) > L.end) { toast('Rent-free period runs past the end of the lease.', 'warning'); return }
  await save('leases', L); openDrawer({ kind: 'leaseView', id: L.id })
}

/* ---------- Co-owner changes: deactivate / add / reactivate, with a new split from a month ---------- */
/** The split in force until the month before `from` is kept in ownerHistory; `owners` becomes the new current split. */
export async function submitOwnerChange(leaseId, { mode, ownerId, owners, from, note }) {
  const L = S.leases.find(l => l.id === leaseId); if (!L) return
  const ids = owners.map(o => o.ownerId)
  if (new Set(ids).size !== ids.length) { toast('The same owner is listed twice.', 'warning'); return }
  for (const [k, lbl] of [['rent', 'Rent'], ['maint', 'Maintenance']]) { const t = owners.reduce((a, o) => a + (+o[k] || 0), 0); if (owners.length > 1 && Math.abs(t - 100) > 0.01) { toast(`${lbl} shares add up to ${Math.round(t * 100) / 100}% — they must total 100%.`, 'warning'); return } }
  const prev = leaseOwners(L); const startP = L.start.slice(0, 7); const until = perAdd(from, -1)
  if (until >= startP) L.ownerHistory = (L.ownerHistory || []).filter(h => h.until < until).concat({ until, owners: prev, changedAt: nowISO(), by: actor() })
  L.owners = owners.length > 1 ? owners : owners.map(o => ({ ...o, rent: 100, maint: 100, dep: 100, adv: 100 }))
  L.ownerId = owners[0].ownerId
  if (owners.length > 1 && L.tdsPerOwner === undefined) L.tdsPerOwner = true
  const name = owner(ownerId)?.name || ownerId
  const text = mode === 'deactivate' ? `${name} deactivated from ${perLabel(from)}` : mode === 'add' ? `${name} added from ${perLabel(from)}` : `${name} reactivated from ${perLabel(from)}`
  L.ownerChanges = (L.ownerChanges || []).concat({ at: nowISO(), by: actor(), type: mode, ownerId, from, note: note || '', text, split: owners.map(o => `${owner(o.ownerId)?.name || o.ownerId} ${Math.round(o.rent * 100) / 100}%`).join(' · ') })
  await save('leases', L)
  openDrawer({ kind: 'leaseView', id: L.id })
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
export async function submitDepAdj(fd, leaseId, dep) {
  const L = S.leases.find(l => l.id === leaseId); const how = fd.get('how') || 'portal'; const picks = []
  for (const [k] of fd.entries()) { if (!k.startsWith('on_')) continue; const i = k.slice(3); const [period, ownerId, tds] = fd.get('key_' + i).split('|'); const amount = num(fd.get('amt_' + i)); if (amount > 0) picks.push({ period, ownerId, tds: +tds || 0, amount }) }
  if (!picks.length) { toast('Tick at least one month.', 'warning'); return }
  const depOf = oid => dep.owners.find(o => o.ownerId === oid) || { held: 0, available: 0 }
  for (const o of depositOwners(L)) { const want = picks.filter(x => x.ownerId === o.ownerId).reduce((a, x) => a + x.amount, 0); const avail = depOf(o.ownerId).available; if (want > avail) { toast(`${isMulti(L) ? (owner(o.ownerId)?.name || '') + '’s' : 'The'} deposit held (${inr(avail)}) is less than ${inr(want)}.`, 'warning'); return } }
  if (how === 'recorded' && !(fd.get('ref') || '').trim()) { toast('Add the reference for the owner’s agreement.', 'warning'); return }
  const consent = how === 'recorded' ? { how: fd.get('how2'), on: fd.get('on'), ref: fd.get('ref'), by: actor() } : null
  L.depAdj = (L.depAdj || []).concat(picks.map(x => Object.assign({ id: newId(), status: consent ? 'Agreed' : 'Proposed', consent, note: fd.get('note') || '', createdAt: nowISO(), createdBy: actor() }, x)))
  if (consent) await settleWithDeposit(L)
  await save('leases', L)
  const byOwner = {}; picks.forEach(x => (byOwner[x.ownerId] = byOwner[x.ownerId] || []).push(x))
  for (const [oid, xs] of Object.entries(byOwner)) await save('messages', { propertyId: L.propertyId, ownerId: oid, from: side(), by: actor(), kind: consent ? 'Notice' : 'Approval request', text: `${consent ? 'As agreed' : 'TrustLab proposes'} to settle rent for ${xs.map(x => perLabel(x.period)).join(', ')} from the security deposit held${isMulti(L) ? ' (your share)' : ''}: ${inr(xs.reduce((a, x) => a + x.amount, 0))} in total, with TDS deducted and deposited as usual. Deposit held after this: ${inr(depOf(oid).held - xs.reduce((a, x) => a + x.amount, 0))}.${consent ? '' : ' Please agree or decline under Lease in your portal.'}`, at: nowISO(), files: [], read: { [side()]: true } }, true)
  toast(consent ? 'Recorded — those months are settled from the deposit' : 'Sent to the owner for agreement', 'success'); openDrawer({ kind: 'leaseView', id: L.id })
}
