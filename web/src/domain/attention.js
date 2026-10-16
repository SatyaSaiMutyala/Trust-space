/* "Needs attention" list on the overview — ported from reference/TruSpace.html (attention). Each item's `a` is an action for runAct(). */
import { S, prop } from '../store/store'
import { PRI } from './constants'
import { CUR, perAdd, perLabel, fmtD, inr } from './utils'
import { invState, leaseState, rentCell, slaBreached, depAdjs, obItems, obOut, OB_DATE } from './lease'
import { inspAttention } from './inspection'
import { tdsAttention } from './tds'

export function attentionItems() {
  const items = []
  S.invoices.filter(i => invState(i) === 'Overdue').forEach(i => items.push({ k: 'bad', t: `${i.type} invoice ${i.number} overdue`, s: `${prop(i.propertyId)?.name} · ${inr(i.net)} · due ${fmtD(i.dueDate)}`, a: { act: 'openInv', id: i.id } }))
  S.leases.forEach(L => {
    if (['Draft', 'Terminated'].includes(leaseState(L))) return
    for (let k = -2; k <= 0; k++) {
      const p = perAdd(CUR, k); const rc = rentCell(L, p)
      if (rc.k === 'missing' || (rc.multi && rc.k === 'late' && rc.invs.length < rc.n)) items.push({ k: 'bad', t: `Rent for ${perLabel(p)} not invoiced${rc.multi && rc.invs.length ? ` by ${rc.n - rc.invs.length} of ${rc.n} co-owners` : ''}`, s: `${prop(L.propertyId)?.name} · ${inr(rc.out)} · ask owner or record on their behalf`, a: rc.multi ? { act: 'rentMonth', lease: L.id, period: p } : { act: 'newInvoice', lease: L.id, period: p } })
    }
  })
  S.tickets.filter(slaBreached).forEach(t => items.push({ k: 'warn', t: `${t.no} past SLA — ${t.title}`, s: `${prop(t.propertyId)?.name} · ${PRI[t.priority].l} · ${t.status}`, a: { act: 'openTicket', id: t.id } }))
  inspAttention(items)
  tdsAttention(items)
  S.leases.forEach(L => { const ps = depAdjs(L, null, true).filter(a => a.status === 'Proposed'); if (ps.length) items.push({ k: 'info', t: `Deposit adjustment awaiting owner — ${prop(L.propertyId)?.name}`, s: `${ps.map(a => perLabel(a.period)).join(', ')} · ${inr(ps.reduce((s2, a) => s2 + (+a.amount || 0), 0))}`, a: { act: 'openLease', id: L.id } }) })
  S.leases.forEach(L => { const due = obItems(L).filter(obOut); if (due.length) items.push({ k: 'bad', t: `Opening arrears ${inr(due.reduce((a, it) => a + obOut(it), 0))} — ${prop(L.propertyId)?.name}`, s: `${[...new Set(due.map(it => perLabel(it.period)))].join(', ')} · due since before ${fmtD(OB_DATE)}`, a: { act: 'go', r: 'opening' } }) })
  const noOb = S.leases.filter(L => L.status !== 'Draft' && L.start < OB_DATE && !L.opening && !['Terminated'].includes(leaseState(L))).length
  if (noOb) items.push({ k: 'warn', t: `Enter opening balances for ${noOb} lease${noOb > 1 ? 's' : ''}`, s: `Rent due month by month as on ${fmtD(OB_DATE)}`, a: { act: 'go', r: 'opening' } })
  S.owners.filter(o => o.bankPending).forEach(o => items.push({ k: 'warn', t: `Verify changed bank details — ${o.name}`, s: `Changed ${fmtD(o.bankChangedOn)} · hold rent until verified`, a: { act: 'viewOwnerProfile', id: o.id } }))
  S.messages.filter(m => m.from === 'owner' && !(m.read || {}).tdpl).forEach(m => items.push({ k: 'info', t: `Unread message from ${m.by}`, s: m.text.slice(0, 90), a: { act: 'openConv', id: m.propertyId } }))
  S.leases.filter(L => leaseState(L) === 'Draft').forEach(L => items.push({ k: 'idle', t: `Draft lease ${L.ref} awaiting signature`, s: `${prop(L.propertyId)?.name} · from ${fmtD(L.start)}`, a: { act: 'openLease', id: L.id } }))
  return items
}
