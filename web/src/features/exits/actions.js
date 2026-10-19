/* Exit actions (prototype SUBMIT.exitStart, SUBMIT.exit, ACT.cancelExit). */
import { S, UI, prop, owner, actor, save, closeDrawer, emit } from '../../store/store'
import { fmtD, inr, nowISO, num } from '../../domain/utils'
import { noticeAddrOf, depHeld, isMulti, depositOwners } from '../../domain/lease'
import { uploadFiles } from '../../services/files'

export const EXIT_STEPS = ['Notice served', 'Joint inspection', 'Handover', 'Final settlement', 'Deposit refunded']

/** SUBMIT.exitStart — serve notice, mark the property, optionally send the formal notice, then go to Exits. */
export async function submitExitStart(id, fd) {
  const L = S.leases.find(l => l.id === id); const P = prop(L.propertyId)
  L.exit = { stage: 1, noticeDate: fd.get('noticeDate'), noticeBy: fd.get('noticeBy'), effective: fd.get('effective'), reason: fd.get('reason'), deductions: [], photos: [] }
  await save('leases', L); if (P) { P.status = 'Notice served'; await save('properties', P, true) }
  if (fd.get('send') && P) await save('messages', { propertyId: P.id, ownerId: P.ownerId, from: 'tdpl', by: actor(), kind: 'Notice', text: `Notice of termination for ${P.name} under lease ${L.ref}, served ${fmtD(L.exit.noticeDate)}${owner(P.ownerId) ? ` to ${owner(P.ownerId).name}, ${noticeAddrOf(owner(P.ownerId))}` : ''}. The premises will be vacated on ${fmtD(L.exit.effective)}, subject to joint inspection, handover and settlement of the security deposit of ${inr(L.deposit)}.\nReason: ${L.exit.reason}`, at: nowISO(), files: [], read: { tdpl: true } }, true)
  closeDrawer(); UI.route = 'exits'; emit()
}

/** SUBMIT.exit — advance an exit to `step`. */
export async function submitExit(id, step, fd) {
  const L = S.leases.find(l => l.id === id); const x = L.exit; const P = prop(L.propertyId)
  if (step === 2) { x.inspectionDate = fd.get('inspectionDate'); x.inspectionNotes = fd.get('inspectionNotes'); x.photos = (x.photos || []).concat(await uploadFiles(fd.getAll('files').filter(z => z.size))) }
  if (step === 3) { x.handoverDate = fd.get('handoverDate'); x.meterFinal = fd.get('meterFinal'); x.keys = true; x.restored = !!fd.get('restored') }
  if (step === 4) { x.deductions = (fd.get('deductions') || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.*?)[,\s]+₹?\s*([\d,]+)\s*$/); return m ? { desc: m[1].trim(), amount: +m[2].replace(/,/g, '') } : { desc: l, amount: 0 } }); x.refund = depHeld(L) - x.deductions.reduce((s, d) => s + d.amount, 0) }
  if (step === 5 && isMulti(L)) { x.refunds = depositOwners(L).map(o => ({ ownerId: o.ownerId, amount: num(fd.get('ramt_' + o.ownerId)), date: fd.get('rdate_' + o.ownerId), utr: fd.get('rutr_' + o.ownerId) })); x.refundReceived = x.refunds.reduce((a, r) => a + r.amount, 0); x.refundDate = x.refunds.map(r => r.date).sort().pop(); x.utr = x.refunds.map(r => r.utr).join(', '); if (P) { P.status = 'Vacated'; await save('properties', P, true) } }
  else if (step === 5) { x.refundDate = fd.get('refundDate'); x.utr = fd.get('utr'); x.refundReceived = num(fd.get('refund')); if (P) { P.status = 'Vacated'; await save('properties', P, true) } }
  x.stage = step; await save('leases', L)
}

/** ACT.cancelExit — withdraw the notice. */
export async function cancelExit(id) {
  const L = S.leases.find(l => l.id === id); const P = prop(L.propertyId)
  delete L.exit; await save('leases', L)
  if (P && P.status === 'Notice served') { P.status = 'Active'; save('properties', P, true) }
}
