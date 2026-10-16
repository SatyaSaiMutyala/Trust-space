/* Opening-balance actions (prototype SUBMIT.opening, SUBMIT.obPay, ACT.obUnpay, ACT.obFill). */
import { S, owner, actor, save, toast, closeDrawer } from '../../store/store'
import { TODAY, perAdd, perLabel, fmtD, num, newId } from '../../domain/utils'
import { OB_DATE, obItems, isMulti, schedRow } from '../../domain/lease'

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

/** ACT.obFill — rent rows from the schedule between `from` and the month before OB_DATE that are not already listed (`have` = 'period|owner|type' keys). */
export function obFillItems(L, from, have) {
  from = from || L.start.slice(0, 7); const end = perAdd(OB_DATE.slice(0, 7), -1); const out = []
  for (let p = from; p <= end; p = perAdd(p, 1)) {
    const r = schedRow(L, p); if (!r) continue
    r.split.forEach(x => { const rr = x.rent - x.adj; if (rr <= 0 || have.has(p + '|' + x.ownerId + '|Rent')) return; const gross = rr + (x.mode === 'Forward' ? Math.round(rr * 0.18) : 0); out.push({ period: p, type: 'Rent', ownerId: x.ownerId, amount: gross, note: 'From rent schedule' }) })
  }
  return out
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
