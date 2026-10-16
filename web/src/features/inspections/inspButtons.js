/* Inspection buttons for a lease (prototype inspActionsFor) as descriptors: { key, label, primary, onClick }[]. */
import { isOwner, openDrawer } from '../../store/store'
import { inspOf } from '../../domain/inspection'
import { newInsp, openInsp } from '../../store/actions'

export function inspActions(L) {
  const mi = inspOf(L.id, 'Move-in'), mo = inspOf(L.id, 'Move-out'); const o = isOwner(); const b = []
  const skip = kind => ({ key: 'sk-' + kind, label: kind === 'Move-in' ? 'Skip — existing lease' : 'Skip — no handover record', onClick: () => openDrawer({ kind: 'skipInsp', id: L.id, insp: kind }) })
  if (mi) { b.push({ key: 'mi', label: `Take-over · ${mi.status}`, onClick: () => openInsp(mi.id) }); if (!o && mi.status === 'In progress' && !L.takeoverSkip) b.push(skip('Move-in')) }
  else if (L.takeoverSkip) { b.push({ key: 'mi', label: 'Take-over · Skipped', onClick: () => openDrawer({ kind: 'skipInsp', id: L.id, insp: 'Move-in' }) }); if (!o) b.push({ key: 'mi2', label: 'Record take-over inspection', onClick: () => newInsp(L.id, 'Move-in') }) }
  else if (!o) { b.push({ key: 'mi', label: 'Start take-over inspection', primary: true, onClick: () => newInsp(L.id, 'Move-in') }); b.push(skip('Move-in')) }
  if (mo) { b.push({ key: 'mo', label: `Handover · ${mo.status}`, onClick: () => openInsp(mo.id) }); if (!o && mo.status === 'In progress' && !L.handoverSkip) b.push(skip('Move-out')) }
  else if (L.handoverSkip) { b.push({ key: 'mo', label: 'Handover · Skipped', onClick: () => openDrawer({ kind: 'skipInsp', id: L.id, insp: 'Move-out' }) }); if (!o && L.exit && L.exit.noticeDate) b.push({ key: 'mo2', label: 'Record handover inspection', onClick: () => newInsp(L.id, 'Move-out') }) }
  else if (!o && L.exit && L.exit.noticeDate) { b.push({ key: 'mo', label: 'Start handover inspection', primary: true, onClick: () => newInsp(L.id, 'Move-out') }); b.push(skip('Move-out')) }
  return b
}
