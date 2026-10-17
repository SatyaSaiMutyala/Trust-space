/* Opening-balance actions (prototype SUBMIT.opening, SUBMIT.obPay, ACT.obUnpay, ACT.obFill). */
import { S, owner, actor, save, toast, closeDrawer } from '../../store/store'
import { callApi } from '../../app/store'
import { TODAY, perLabel, fmtD, num, newId } from '../../domain/utils'
import { OB_DATE, obItems, isMulti } from '../../domain/lease'

/** SUBMIT.opening — read every `.obrow` of the form (period, owner, type, amount, remarks; paid details kept from data-paid). */
export async function submitOpening(id, f, fd) {
  const L = S.leases.find(l => l.id === id); const seen = new Set(); const items = []
  for (const tr of f.querySelectorAll('.obrow')) {
    const period = tr.querySelector('.ob-per').value, type = tr.querySelector('.ob-type').value, ownerId = tr.querySelector('.ob-own')?.value || L.ownerId, amount = num(tr.querySelector('.ob-amt').value)
    if (!period || !amount) continue
    if (period >= OB_DATE.slice(0, 7)) { toast(`${perLabel(period)} is after ${fmtD(OB_DATE)} — record it as an invoice instead.`); return }
    const key = period + '|' + ownerId + '|' + type
    if (seen.has(key)) { toast(`${perLabel(period)} ${type.toLowerCase()} is entered twice${isMulti(L) ? ' for ' + (owner(ownerId)?.name || '') : ''}.`); return }
    seen.add(key)
    const paid = JSON.parse(tr.dataset.paid || '{}')
    items.push(Object.assign({ id: tr.dataset.id || newId(), period, type, ownerId, amount, note: tr.querySelector('.ob-note').value.trim() }, Object.fromEntries(Object.entries(paid).filter(([, v]) => v !== undefined && v !== null))))
  }
  items.sort((a, b) => a.period.localeCompare(b.period))
  L.opening = { asOf: OB_DATE, items, confirmed: !!fd.get('confirmed'), confirmedOn: fd.get('confirmed') ? (L.opening?.confirmedOn || TODAY) : null, source: fd.get('source') || '', enteredBy: actor(), enteredOn: L.opening?.enteredOn || TODAY }
  await save('leases', L); closeDrawer()
}

/** ACT.obFill — rent rows from the schedule (GET /api/leases/:id/opening-fill) between `from` and the month before OB_DATE that are not already listed (`have` = 'period|owner|type' keys). */
export async function obFillItems(L, from, have) {
  const res = await callApi('openingFill', { id: L.id, from: from || L.start.slice(0, 7) })
  return res.data.items.filter(x => !have.has(x.period + '|' + x.ownerId + '|' + x.type))
}

/** SUBMIT.obPay — record the payment against one opening-balance item. */
export async function submitObPay(leaseId, itemId, fd) {
  const L = S.leases.find(l => l.id === leaseId); const it = obItems(L).find(x => x.id === itemId)
  Object.assign(it, { paidOn: fd.get('paidOn'), utr: fd.get('utr'), paidAmount: num(fd.get('paidAmount')), tds: num(fd.get('tds')) })
  await save('leases', L); closeDrawer()
}

/** ACT.obUnpay — undo a recorded payment. */
export async function obUnpay(leaseId, itemId) {
  const L = S.leases.find(l => l.id === leaseId); const it = obItems(L).find(x => x.id === itemId)
  ;['paidAmount', 'tds', 'paidOn', 'utr'].forEach(k => delete it[k])
  await save('leases', L); closeDrawer()
}
