/* Lease actions and the lease form submit — ported from reference/TruSpace.html (ACT.renewLease/activateLease/schedMode/schedCsv, leaseFromForm, SUBMIT.lease). */
import { S, UI, prop, save, toast, emit, openDrawer } from '../../store/store'
import { newInsp } from '../../store/actions'
import { addDays, addMonths, num } from '../../domain/utils'
import { rentFor, scheduleCsv } from '../../domain/lease'
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

/** Read the lease form into a lease record (prototype leaseFromForm). */
export function leaseFromForm(f, base) {
  const fd = new FormData(f); const P = prop(fd.get('propertyId'))
  return Object.assign({}, base, { ref: fd.get('ref'), propertyId: fd.get('propertyId'), ownerId: base.ownerId || P?.ownerId, start: fd.get('start'), end: fd.get('end'), lockIn: num(fd.get('lockIn')), notice: num(fd.get('notice')), fitout: num(fd.get('fitout')), status: fd.get('status'), rent: num(fd.get('rent')), payTiming: fd.get('payTiming'), dueDay: Math.min(28, num(fd.get('dueDay')) || 5), escPct: num(fd.get('escPct')), escEvery: num(fd.get('escEvery')), escType: fd.get('escType'), escFrom: fd.get('escFrom'), deposit: num(fd.get('deposit')), depositPaid: !!fd.get('depositPaid'), advanceRent: num(fd.get('advanceRent')), advanceMonths: num(fd.get('advanceMonths')), brokerage: num(fd.get('brokerage')), maintType: fd.get('maintType'), maint: num(fd.get('maint')), maintEsc: !!fd.get('maintEsc'), elec: fd.get('elec'), gstMode: fd.get('gstMode'), tds: !!fd.get('tds'), tdsOnMaint: !!fd.get('tdsOnMaint'), registered: !!fd.get('registered'), stamp: num(fd.get('stamp')), clauses: fd.get('clauses') })
}

/** SUBMIT.lease */
export async function submitLease(f, fd, id) {
  const old = id ? S.leases.find(l => l.id === id) : {}
  const P = prop(fd.get('propertyId'))
  const docs = (old.docs || []).concat(await uploadFiles(fd.getAll('files').filter(x => x.size)))
  const L = leaseFromForm(f, Object.assign({}, old, { ownerId: P?.ownerId || old.ownerId, docs }))
  if (L.end <= L.start) { toast('End date must be after the start date.', 'warning'); return }
  if (addDays(L.start, L.fitout) > L.end) { toast('Rent-free period runs past the end of the lease.', 'warning'); return }
  await save('leases', L); openDrawer({ kind: 'leaseView', id: L.id })
}
