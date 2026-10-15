/* Invoice actions and form submissions (prototype ACT.invStep / invReject / dlInvoice / exportCsv, SUBMIT.invoice / reject / pay). */
import { S, prop, owner, save, actor, isOwner, inScope, openDrawer, toast } from '../../store/store'
import { nowISO, by, inr, num, perLabel, addDays, TODAY } from '../../domain/utils'
import { leaseOf, calc, schedRow, statementCsv } from '../../domain/lease'
import { invoiceHTML } from '../../domain/documents'
import { uploadFiles, offerDownload } from '../../services/files'

/** Move an invoice to Verified / Approved, logging who did it (franchise premises use neutral wording). */
export async function invStep(id, s) {
  const i = S.invoices.find(x => x.id === id); i.status = s
  i.log = (i.log || []).concat({ at: nowISO(), by: actor(), text: prop(i.propertyId)?.managedBy === 'franchise' ? (s === 'Verified' ? 'Verified' : 'Approved for payment') : s === 'Verified' ? 'Verified by Accounts Payable' : 'Approved for payment by CMD' })
  await save('invoices', i)
}

export function dlInvoice(id) { const i = S.invoices.find(x => x.id === id); offerDownload(`${i.number.replace(/[^\w-]+/g, '_')}.html`, invoiceHTML(i)) }

export function exportCsv() { const inv = S.invoices.filter(inScope).sort(by('date')); offerDownload(`TruSpace-statement-${TODAY}.csv`, statementCsv(inv, owner)) }

export async function rejectInvoice(id, fd) {
  const i = S.invoices.find(x => x.id === id); i.status = 'Rejected'; i.reason = fd.get('reason')
  i.log = (i.log || []).concat({ at: nowISO(), by: actor(), text: 'Rejected: ' + i.reason }); await save('invoices', i)
}

export async function payInvoice(id, fd) {
  const i = S.invoices.find(x => x.id === id)
  Object.assign(i, { status: 'Paid', paidDate: fd.get('paidDate'), utr: fd.get('utr'), paidAmount: num(fd.get('paidAmount')), tdsDeducted: num(fd.get('tdsDeducted')) })
  i.log = (i.log || []).concat({ at: nowISO(), by: actor(), text: `Paid ${inr(i.paidAmount)} · UTR ${i.utr}${i.tdsDeducted ? ' · TDS ' + inr(i.tdsDeducted) : ''}` })
  await save('invoices', i)
}

/**
 * SUBMIT.invoice. gst = GST checkbox state (checked && !disabled) or undefined when the box is absent.
 * dup = object whose .ok flag is set after the first duplicate warning (the prototype's f.dataset.dupOk).
 */
export async function submitInvoice(fd, { gst, dup }) {
  const pid = fd.get('propertyId'); const L = leaseOf(pid); const type = fd.get('type'); const period = fd.get('period')
  const d0 = S.invoices.find(i => i.leaseId === L.id && i.type === type && i.period === period && i.status !== 'Rejected')
  if (d0 && type !== 'Other' && !dup.ok) { dup.ok = true; toast(`${type} for ${perLabel(period)} already exists (${d0.number}). Submit again to add another.`, 'warning'); return }
  const c = calc(L, type, fd.get('base'), period, gst)
  const files = await uploadFiles(fd.getAll('files').filter(x => x.size))
  if (fd.get('mode') === 'upload' && !files.length) { toast('Attach the invoice copy to upload it.', 'warning'); return }
  const reading = type === 'Electricity' ? { open: num(fd.get('ropen')), close: num(fd.get('rclose')), rate: num(fd.get('rrate')), fixed: num(fd.get('rfixed')) } : undefined
  const date = fd.get('date')
  const inv = {
    number: fd.get('number'), propertyId: pid, leaseId: L.id, ownerId: L.ownerId, type, period, date,
    dueDate: (() => { const dd = schedRow(L, period)?.due || period + '-' + String(L.dueDay || 5).padStart(2, '0'); return dd < date ? addDays(date, 7) : dd })(),
    base: c.base, gst: c.gst, rcm: c.rcm, tds: c.tds, total: c.total, net: c.net, source: fd.get('mode') === 'upload' ? 'Uploaded' : 'Generated', files, status: 'Submitted',
    desc: fd.get('desc') + (reading ? ` · ${reading.open}–${reading.close} kWh @ ₹${reading.rate}` : ''), reading,
    log: [{ at: nowISO(), by: actor(), text: isOwner() ? 'Invoice submitted by owner' : 'Recorded by TrustLab on owner’s behalf' }],
  }
  const saved = await save('invoices', inv)
  openDrawer({ kind: 'invoiceView', id: saved.id })
}
