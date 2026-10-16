/* Inspection buttons for a lease (prototype inspActionsFor) as descriptors: { key, label, primary, onClick }[].
   A skipped take-over / handover shows as "Skipped" while any inspection is still only In progress; a submitted or signed
   inspection supersedes the skip. */
import { isOwner, openDrawer } from '../../store/store'
import { inspOf } from '../../domain/inspection'
import { newInsp, openInsp } from '../../store/actions'

const NAME = { 'Move-in': 'Take-over', 'Move-out': 'Handover' }

export function inspActions(L) {
  const o = isOwner(); const b = []
  const skipDrawer = kind => openDrawer({ kind: 'skipInsp', id: L.id, insp: kind })
  const push = (kind, sk, canStart) => {
    const I = inspOf(L.id, kind); const n = NAME[kind]; const live = I && I.status !== 'In progress'
    if (sk && !live) {
      b.push({ key: kind, label: `${n} · Skipped`, onClick: () => skipDrawer(kind) })
      if (!o) b.push(I ? { key: kind + '2', label: `Continue ${n.toLowerCase()} · In progress`, onClick: () => openInsp(I.id) } : canStart ? { key: kind + '2', label: `Record ${n.toLowerCase()} inspection`, onClick: () => newInsp(L.id, kind) } : null)
    } else if (I) {
      b.push({ key: kind, label: `${n} · ${I.status}`, onClick: () => openInsp(I.id) })
      if (!o && I.status === 'In progress') b.push({ key: kind + '-sk', label: kind === 'Move-in' ? 'Skip — existing lease' : 'Skip — no handover record', onClick: () => skipDrawer(kind) })
    } else if (!o && canStart) {
      b.push({ key: kind, label: `Start ${n.toLowerCase()} inspection`, primary: true, onClick: () => newInsp(L.id, kind) })
      b.push({ key: kind + '-sk', label: kind === 'Move-in' ? 'Skip — existing lease' : 'Skip — no handover record', onClick: () => skipDrawer(kind) })
    }
  }
  push('Move-in', L.takeoverSkip, true)
  push('Move-out', L.handoverSkip, !!(L.exit && L.exit.noticeDate))
  return b.filter(Boolean)
}
