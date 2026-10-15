/* "Needs attention" list on the overview — ported from reference/TruSpace.html (attention). Each item's `a` is an action for runAct(). */
import { S, prop } from '../store/store'
import { PRI } from './constants'
import { CUR, perAdd, perLabel, fmtD, inr } from './utils'
import { invState, leaseState, rentCell, schedRow, slaBreached } from './lease'
import { inspAttention } from './inspection'

export function attentionItems() {
  const items = []
  S.invoices.filter(i => invState(i) === 'Overdue').forEach(i => items.push({ k: 'bad', t: `${i.type} invoice ${i.number} overdue`, s: `${prop(i.propertyId)?.name} · ${inr(i.net)} · due ${fmtD(i.dueDate)}`, a: { act: 'openInv', id: i.id } }))
  S.leases.forEach(L => { if (['Draft', 'Terminated'].includes(leaseState(L))) return; for (let k = -2; k <= 0; k++) { const p = perAdd(CUR, k); if (rentCell(L, p).k === 'missing') items.push({ k: 'bad', t: `Rent for ${perLabel(p)} not invoiced`, s: `${prop(L.propertyId)?.name} · ${inr((schedRow(L, p)?.rent || 0) - (schedRow(L, p)?.adj || 0))} · ask owner or record on their behalf`, a: { act: 'newInvoice', lease: L.id, period: p } }) } })
  S.tickets.filter(slaBreached).forEach(t => items.push({ k: 'warn', t: `${t.no} past SLA — ${t.title}`, s: `${prop(t.propertyId)?.name} · ${PRI[t.priority].l} · ${t.status}`, a: { act: 'openTicket', id: t.id } }))
  inspAttention(items)
  S.owners.filter(o => o.bankPending).forEach(o => items.push({ k: 'warn', t: `Verify changed bank details — ${o.name}`, s: `Changed ${fmtD(o.bankChangedOn)} · hold rent until verified`, a: { act: 'viewOwnerProfile', id: o.id } }))
  S.messages.filter(m => m.from === 'owner' && !(m.read || {}).tdpl).forEach(m => items.push({ k: 'info', t: `Unread message from ${m.by}`, s: m.text.slice(0, 90), a: { act: 'openConv', id: m.propertyId } }))
  S.leases.filter(L => leaseState(L) === 'Draft').forEach(L => items.push({ k: 'idle', t: `Draft lease ${L.ref} awaiting signature`, s: `${prop(L.propertyId)?.name} · from ${fmtD(L.start)}`, a: { act: 'openLease', id: L.id } }))
  return items
}
