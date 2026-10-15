/* Message actions (prototype SUBMIT.msg, ACT.conv / ACT.convBack). */
import { S, UI, prop, side, actor, save, emit } from '../../store/store'
import { nowISO } from '../../domain/utils'
import { uploadFiles } from '../../services/files'

export function selectConv(pid) { UI.conv = pid; UI.convOpen = true; emit() }
export function convBack() { UI.convOpen = false; emit() }

/** SUBMIT.msg — returns false when there was nothing to send. */
export async function sendMessage(pid, fd) {
  const P = prop(pid); const files = await uploadFiles(fd.getAll('files').filter(x => x.size))
  const text = (fd.get('text') || '').trim(); if (!text) return false
  await save('messages', { propertyId: pid, ownerId: P.ownerId, from: side(), by: actor(), kind: fd.get('kind'), text, at: nowISO(), files, read: { [side()]: true } }, true)
  return true
}

/** Mark the other side's messages in a thread as read (quiet save). */
export function markRead(ids) {
  const s = side()
  ids.forEach(id => { const m = S.messages.find(x => x.id === id); if (m) { m.read = Object.assign({}, m.read, { [s]: true }); save('messages', m, true) } })
}
