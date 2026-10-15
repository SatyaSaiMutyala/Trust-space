/*
 * Joint inspection actions — ports of the prototype's ACT (icond, iphotoDel, ifixAdd, ifixDel, ijump, inspReopen, dlInsp),
 * the live-save change listeners and SUBMIT (inspSubmit, inspOnsite, inspOwner). reference/TruSpace.html 1869–1968.
 */
import { S, prop, actor, save, toast, drawDrawer, closeDrawer, remove } from '../../store/store'
import { saveInsp, inspLocked, inspProblems, inspFinalise, inspReport } from '../../domain/inspection'
import { BADC, FIX_SEC, IN_KIND } from '../../domain/constants'
import { newId, nowISO, fmtD } from '../../domain/utils'
import { uploadFiles, offerDownload, videoMeta } from '../../services/files'

const findInsp = id => S.inspections.find(x => x.id === id)

/* ---------- ACT ---------- */
export function icond(I, k, v) {
  if (!I || inspLocked(I)) return
  const it = I.items.find(x => x.k === k); it.cond = it.cond === v ? '' : v
  if (!BADC(it.cond)) { delete it.resp; delete it.deduct }
  saveInsp(I); drawDrawer()
}
export function iphotoDel(I, k, i) {
  if (!I) return
  if (k === '__room') I.roomPhotos.splice(+i, 1); else I.items.find(x => x.k === k).photos.splice(+i, 1)
  saveInsp(I); drawDrawer()
}
export function ifixAdd(I) { I.items.push({ k: 'fx_' + newId(), sec: FIX_SEC, label: '', type: 'fixture', req: false, qty: 1, cond: '', remark: '', photos: [] }); saveInsp(I); drawDrawer() }
export function ifixDel(I, k) { I.items = I.items.filter(x => x.k !== k); saveInsp(I); drawDrawer() }
export function ijump(k) {
  const el = document.getElementById('it-' + k)
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400) }
}
export async function inspReopen(id) {
  const I = findInsp(id); I.status = 'In progress'; delete I.tdplSign; delete I.ownerSign
  I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: 'Reopened for correction' })
  await saveInsp(I, true); drawDrawer()
}
export function dlInsp(id) { const I = findInsp(id); offerDownload(`${(prop(I.propertyId)?.code || 'site')}-${I.kind}-inspection-${I.date}.html`, inspReport(I)) }
/** Footer “Delete” (ACT.delete for the inspections collection). */
export async function delInsp(id) { closeDrawer(); await remove('inspections', id) }

/* ---------- change listener (live saving) ---------- */
/** data-ik inputs: item field (val, label, qty, remark, resp, deduct). */
export function itemField(I, k, f, value) {
  const it = I.items.find(x => x.k === k); if (!it) return
  it[f] = value; saveInsp(I); if (f === 'resp') drawDrawer()
}
/** data-ih inputs: header field (date, inspector, ownerRep, present). */
export function headField(I, f, value) { I[f] = value; saveInsp(I) }
/** data-iphoto inputs: photos / videos for an item, or area-wise photos (k = '__room'). */
export async function addPhotos(I, k, fileList) {
  const up = await uploadFiles(fileList, 12)
  if (k === '__room') I.roomPhotos = (I.roomPhotos || []).concat(up)
  else { const it = I.items.find(x => x.k === k); it.photos = (it.photos || []).concat(up) }
  await saveInsp(I, true); drawDrawer()
}
/** data-ivideo inputs: confirmation video (who = 'tdpl' | 'owner'). Returns once done; onUploading() fires after the checks pass. */
export async function recordVideo(I, who, f, onUploading) {
  const dur = await videoMeta(f)
  if (dur !== null && isFinite(dur) && dur < 5) { toast('Video is too short — record at least 5 seconds.', 'warning'); return }
  if (dur !== null && isFinite(dur) && dur > 120) { toast('Keep the video under 2 minutes.', 'warning'); return }
  if (f.size > 20e6) { toast(`Video is ${(f.size / 1e6).toFixed(0)} MB — the limit is 20 MB. Record a shorter clip or at 720p.`, 'warning'); return }
  onUploading?.()
  const up = await uploadFiles([f], 1); if (!up.length) { drawDrawer(); return }
  I[who + 'Video'] = Object.assign(up[0], { at: nowISO(), by: who === 'tdpl' ? (I.inspector || actor()) : (I.ownerRep || actor()), dur: dur && isFinite(dur) ? dur : 0, size: f.size })
  I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: `${who === 'tdpl' ? 'TrustLab employee' : 'Owner'} confirmation video recorded` })
  await saveInsp(I, true); drawDrawer()
}

/* ---------- SUBMIT ---------- */
export async function inspSubmit(id) {
  const I = findInsp(id)
  if (inspProblems(I).length) { toast('Complete every item first.', 'warning'); return }
  I.status = 'Awaiting owner sign-off'; I.tdplSign = { name: I.inspector, at: nowISO(), method: 'TruSpace' }
  I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: `Signed for TrustLab by ${I.inspector}; sent to owner for sign-off` })
  await saveInsp(I, true)
  const P = prop(I.propertyId)
  if (P) save('messages', { propertyId: P.id, ownerId: P.ownerId, from: 'tdpl', by: actor(), kind: 'Approval request', text: `${IN_KIND[I.kind]} of ${P.name} dated ${fmtD(I.date)} is ready for your signature. Open Inspections in your portal to review every item and photo, then sign or raise a dispute.`, at: nowISO(), files: [], read: { tdpl: true } }, true)
  drawDrawer()
}
export async function inspOnsite(id, fd) {
  const I = findInsp(id)
  if (!I.ownerVideo) { toast('Owner’s confirmation video is required.', 'warning'); return }
  const files = await uploadFiles(fd.getAll('files').filter(x => x.size), 1)
  await inspFinalise(I, fd.get('name'), 'On site, TrustLab device', files); drawDrawer()
}
/** act = submitter value: 'sign' | 'dispute'. */
export async function inspOwner(id, fd, act = 'sign') {
  const I = findInsp(id)
  if (act === 'dispute') {
    const why = (fd.get('dispute') || '').trim()
    if (!why) { toast('Explain what is wrong so TrustLab can correct it.', 'warning'); return }
    I.status = 'Disputed'; I.dispute = why; delete I.tdplSign
    I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: 'Owner disputed: ' + why })
    await saveInsp(I, true); drawDrawer(); return
  }
  if (!fd.get('agree')) { toast('Tick the agreement box to sign.', 'warning'); return }
  if (!I.ownerVideo) { toast('Record your confirmation video first.', 'warning'); return }
  await inspFinalise(I, fd.get('name'), 'Owner portal', []); drawDrawer()
}
