/* Inspection buttons for a lease (prototype inspActionsFor) as descriptors: { key, label, primary, onClick }[]. */
import { isOwner, openDrawer } from '../../store/store'
import { inspOf } from '../../domain/inspection'
import { newInsp, openInsp } from '../../store/actions'

export function inspActions(L) {
  const mi = inspOf(L.id, 'Move-in'), mo = inspOf(L.id, 'Move-out'); const o = isOwner(); const b = []
  if (mi) b.push({ key: 'mi', label: `Take-over · ${mi.status}`, onClick: () => openInsp(mi.id) })
  else if (L.takeoverSkip) { b.push({ key: 'mi', label: 'Take-over · Skipped', onClick: () => openDrawer({ kind: 'skipTakeover', id: L.id }) }); if (!o) b.push({ key: 'mi2', label: 'Record take-over inspection', onClick: () => newInsp(L.id, 'Move-in') }) }
  else if (!o) { b.push({ key: 'mi', label: 'Start take-over inspection', primary: true, onClick: () => newInsp(L.id, 'Move-in') }); b.push({ key: 'sk', label: 'Skip — existing lease', onClick: () => openDrawer({ kind: 'skipTakeover', id: L.id }) }) }
  if (mo) b.push({ key: 'mo', label: `Handover · ${mo.status}`, onClick: () => openInsp(mo.id) })
  else if (!o && L.exit && L.exit.noticeDate) b.push({ key: 'mo', label: 'Start handover inspection', primary: true, onClick: () => newInsp(L.id, 'Move-out') })
  return b
}
