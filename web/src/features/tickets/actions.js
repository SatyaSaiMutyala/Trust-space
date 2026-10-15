/* Ticket submit handlers (prototype SUBMIT.ticket / SUBMIT.tupdate). */
import { S, save, prop, actor, side, isOwner, openDrawer } from '../../store/store'
import { PRI } from '../../domain/constants'
import { nowISO, num } from '../../domain/utils'
import { uploadFiles } from '../../services/files'

export const DONE = ['Resolved', 'Closed']

/** SUBMIT.ticket — raise a ticket, tell the owner, then open it. */
export async function submitTicket(fd) {
  const photos = await uploadFiles(fd.getAll('files').filter(x => x.size))
  const max = S.tickets.reduce((m, t) => Math.max(m, parseInt((t.no || '').split('-')[1]) || 0), 140)
  const t = { no: 'TKT-' + String(max + 1).padStart(4, '0'), propertyId: fd.get('propertyId'), title: fd.get('title'), category: fd.get('category'), priority: fd.get('priority'), responsibility: fd.get('responsibility'), status: 'Open', assignee: fd.get('assignee') || (isOwner() ? 'TrustLab Facilities' : ''), cost: 0, costBy: fd.get('responsibility'), photos, raisedBy: actor(), log: [{ at: nowISO(), by: actor(), text: fd.get('text') }] }
  const saved = await save('tickets', t)
  const P = prop(t.propertyId)
  if (P && (t.responsibility !== 'TrustLab' || isOwner())) save('messages', { propertyId: P.id, ownerId: P.ownerId, from: side(), by: actor(), kind: 'Message', text: `New repair ticket ${t.no}: ${t.title} (${PRI[t.priority].l}, ${t.responsibility} responsibility).`, at: nowISO(), files: [], read: { [side()]: true } }, true)
  openDrawer({ kind: 'ticketView', id: saved.id })
}

/** SUBMIT.tupdate — add an activity entry, optionally changing status / assignee / priority / cost. */
export async function submitTicketUpdate(id, fd) {
  const t = S.tickets.find(x => x.id === id); const photos = await uploadFiles(fd.getAll('files').filter(x => x.size))
  const ns = fd.get('status'); const entry = { at: nowISO(), by: actor(), text: fd.get('text'), photos }; if (ns !== t.status) entry.status = ns
  Object.assign(t, { status: ns, cost: num(fd.get('cost')), costBy: fd.get('costBy') }); if (fd.get('assignee') !== null) t.assignee = fd.get('assignee'); if (fd.get('priority')) t.priority = fd.get('priority')
  if (DONE.includes(ns) && !t.resolvedAt) t.resolvedAt = nowISO()
  t.log = (t.log || []).concat(entry); await save('tickets', t)
}
