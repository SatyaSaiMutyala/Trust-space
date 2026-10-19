/* Site evaluation drawer actions — ported from the prototype's ACT / change listener / SUBMIT blocks for DRAWERS.site. */
import { S, ALL, APP, partner, save, toast, openDrawer, drawDrawer, emit } from '../../../store/store'
import { saveSite, slog, siteStage, siteScore, siteProblems, isFr, reqOf, frLetter, siteReport } from '../../../domain/site'
import { ACCEPTORS } from '../../../domain/constants'
import { TODAY, nowISO, fmtD, inr, num, addDays, addMonths } from '../../../domain/utils'
import { uploadFiles, offerDownload } from '../../../services/files'

const curSite = () => APP.drawer && APP.drawer.kind === 'site' ? S.sites.find(x => x.id === APP.drawer.id) : null
const findSite = id => S.sites.find(x => x.id === id)

/* ---------- ACT ---------- */
export function scheck(k, v) {
  const st = curSite(); if (!st) return
  st.checks = st.checks || {}; const c = st.checks[k] = st.checks[k] || {}; c.v = c.v === v ? '' : v
  if (st.stage === 'Scouted') { st.stage = 'Scrutiny'; slog(st, 'Scrutiny started') }
  saveSite(st); drawDrawer()
}
export function sphotoDel(k, i) {
  const st = curSite(); if (!st) return
  if (k === '__site') st.photos.splice(+i, 1); else if (k === '__sign') st.sign.photos.splice(+i, 1); else if (k === '__earth') st.earth.photos.splice(+i, 1); else if (k === '__frontvid') st.frontVideos.splice(+i, 1); else st.checks[k].photos.splice(+i, 1)
  saveSite(st); drawDrawer()
}
export async function siteGo(id, to) {
  const st = findSite(id)
  if (to === 'Shortlisted') { const sc = siteScore(st); if (siteProblems(st).length || sc.crit.length) { toast('Complete the checklist first — no critical failures allowed.', 'warning'); return } slog(st, `Shortlisted — score ${sc.pct}% (${sc.verdict})`) } else slog(st, `Moved to ${to}`)
  st.stage = to; delete st.rejectReason; delete st.holdReason; await saveSite(st, true); drawDrawer()
}
/** Reveal the reject / hold form, scroll to it and focus the reason. */
export function siteRejectShow(show) {
  show()
  requestAnimationFrame(() => { const el = document.getElementById('srej'); if (el) { el.scrollIntoView({ behavior: 'smooth' }); document.getElementById('sj-r')?.focus() } })
}
export async function siteSendAccept(id) {
  const st = findSite(id); const t = st.terms || {}
  if (isFr(st)) { st.stage = 'Acceptance'; st.accept = {}; slog(st, 'Franchise location sent to Business Heads (Operations, Commercials) for acceptance'); await saveSite(st, true); drawDrawer(); return }
  if (!(t.rent && t.deposit && t.term && t.start)) { toast('Fill rent, deposit, term and possession date.', 'warning'); return }
  st.stage = 'Acceptance'; st.accept = {}; slog(st, `Sent to Business Heads (Operations, Commercials) for acceptance — rent ${inr(t.rent)}/month`); await saveSite(st, true); drawDrawer()
}
export async function siteApprove(id) {
  const st = findSite(id); const t = st.terms || {}
  if (!ACCEPTORS.every(([k]) => (st.accept || {})[k]?.ok)) { toast('Both business heads must accept first.', 'warning'); return }
  if (isFr(st)) { st.stage = 'Approved'; st.approval = { by: 'CMD', at: nowISO(), note: 'Location approved for franchise' }; st.frValidity = st.frValidity || 90; slog(st, 'Franchise location approved by CMD'); await saveSite(st, true); drawDrawer(); return }
  if (!(t.rent && t.deposit && t.term && t.start)) { toast('Fill rent, deposit, term and possession date.', 'warning'); return }
  st.stage = 'Approved'; st.approval = { by: 'CMD', at: nowISO(), note: `Rent ${inr(t.rent)}, deposit ${inr(t.deposit)}, ${t.term} months` }; slog(st, `Deal approved by CMD — rent ${inr(t.rent)}/month`); await saveSite(st, true); drawDrawer()
}
export function frSubmit(id) {
  const st = findSite(id); const miss = []
  if (!st.name) miss.push('site name'); if (!st.frontPhoto) miss.push('front-view photo'); if ((st.photos || []).length < 3) miss.push('3 site photos'); if (!(st.area || st.measuredArea)) miss.push('area'); if (!(st.catch || {}).case) miss.push('why this location suits')
  if (miss.length) { toast('Add before submitting: ' + miss.join(', '), 'warning'); return }
  st.stage = 'Scrutiny'; slog(st, 'Submitted by franchise partner for TrustLab assessment'); saveSite(st, true).then(drawDrawer)
}
export function dlFrLetter(id) { const st = findSite(id); offerDownload(`${st.code}-location-approval.html`, frLetter(st)) }
export async function frEnable(id) { const pa = partner(id); pa.premisesMgmt = true; await save('partners', pa); toast(`${pa.name} can now manage premises in TruSpace`, 'warning'); drawDrawer() }
export function dlSite(id) { const st = findSite(id); offerDownload(`${st.code}-site-evaluation.html`, siteReport(st)) }
/** Scroll to an anchor `it-<key>` and flash it. */
export function ijump(k) { const el = document.getElementById('it-' + k); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400) } }

/* ---------- change listener (data-sk / sg / se / sq / sa / sfront / sc / sd / st / sphoto) ---------- */
const nv = (v, type) => type === 'number' ? (v === '' ? '' : num(v)) : v
export function onSk(st, k, value) { st.checks = st.checks || {}; (st.checks[k] = st.checks[k] || {}).remark = value; saveSite(st); emit() }
export function onSg(st, k, value, type, isSelect) { st.sign = st.sign || {}; st.sign[k] = nv(value, type); saveSite(st); if (isSelect) drawDrawer() }
export function onSe(st, k, value, type) { st.earth = st.earth || {}; st.earth[k] = nv(value, type); saveSite(st); drawDrawer() }
export function onSq(st, k, value) { st.spaceReq = st.spaceReq || {}; st.spaceReq[k] = value === '' ? '' : num(value); saveSite(st); drawDrawer() }
export function onSa(st, k, value) { st.space = st.space || {}; st.space[k] = value === '' ? '' : num(value); saveSite(st); drawDrawer() }
export async function onSfront(st, files) { const up = await uploadFiles(files, 1); if (up[0]) { st.frontPhoto = up[0]; slog(st, 'Front-view photo added') } await saveSite(st, true); drawDrawer() }
export function onSc(st, k, value) { st.catch = st.catch || {}; st.catch[k] = k === 'case' ? value : (value === '' ? '' : num(value)); saveSite(st); if (k !== 'case') drawDrawer() }
export function onSd(st, k, value, type) { st[k] = type === 'number' ? num(value) : value; saveSite(st); if (['name', 'locality', 'city', 'map'].includes(k)) emit() }
export function onSt(st, k, value, type) { st.terms = st.terms || {}; st.terms[k] = type === 'number' ? num(value) : value; saveSite(st); if (siteStage(st) === 'Negotiation') drawDrawer() }
export async function onSphoto(st, k, files) {
  const up = await uploadFiles(files, 12)
  if (k === '__site') st.photos = (st.photos || []).concat(up)
  else if (k === '__sign') { st.sign = st.sign || {}; st.sign.photos = (st.sign.photos || []).concat(up) }
  else if (k === '__earth') { st.earth = st.earth || {}; st.earth.photos = (st.earth.photos || []).concat(up) }
  else if (k === '__frontvid') st.frontVideos = (st.frontVideos || []).concat(up)
  else { st.checks = st.checks || {}; const c = st.checks[k] = st.checks[k] || {}; c.photos = (c.photos || []).concat(up) }
  await saveSite(st, true); drawDrawer()
}

/* ---------- SUBMIT ---------- */
export async function siteAccept(id, who, fd, act) {
  const st = findSite(id); const lbl = ACCEPTORS.find(a => a[0] === who)[1]; const note = (fd.get('note') || '').trim()
  if (act === 'return') { if (!note) { toast('Add comments to return the deal.', 'warning'); return } st.returns = (st.returns || []).concat({ by: `${fd.get('name')} (${lbl})`, note, at: nowISO() }); st.stage = 'Negotiation'; st.accept = {}; slog(st, `Returned to negotiation by ${fd.get('name')} (${lbl}): ${note}`) }
  else { st.accept = Object.assign({}, st.accept, { [who]: { ok: true, name: fd.get('name'), note, at: nowISO() } }); slog(st, `Accepted by ${fd.get('name')} (${lbl})${note ? ': ' + note : ''}`) }
  await saveSite(st, true); drawDrawer()
}
export async function frManage(id, fd) {
  const st = findSite(id); const rq = reqOf(st); const pa = partner(rq?.partnerId); const t = st.terms || {}
  const O = await save('owners', { name: fd.get('ownerName'), kind: 'Individual', phone: fd.get('ownerPhone') || '', email: '', pan: '', gstin: '', partnerId: pa.id, invPrefix: fd.get('ownerName').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase() }, true)
  const P = await save('properties', { code: fd.get('code').toUpperCase(), name: st.name, type: st.purpose, branch: 'Franchise — ' + pa.name, address: st.address || st.locality, city: st.city, state: st.state, area: +(st.measuredArea || st.area) || 0, floors: st.floor || '', ownerId: O.id, status: 'Pipeline', managedBy: 'franchise', partnerId: pa.id, meter: '', photos: (st.photos || []).slice(0, 6), frontPhoto: st.frontPhoto || null, earthing: Object.assign({}, st.earth || {}, { photos: undefined }), signage: Object.assign({}, st.sign || {}, { photos: undefined }), docs: [], siteId: st.id }, true)
  const start = t.start || TODAY
  const L = await save('leases', { ref: 'FR-LSE-' + String(ALL.leases.filter(l => ALL.properties.find(p => p.id === l.propertyId)?.partnerId === pa.id).length + 1).padStart(3, '0'), propertyId: P.id, ownerId: O.id, start, end: addDays(addMonths(start, +t.term || 60), -1), lockIn: +t.lockIn || 0, notice: 3, noticeLessor: 3, rent: +t.rent || 0, escPct: 5, escEvery: 12, escType: 'Compound', escFrom: 'Lease start', payTiming: 'Advance', dueDay: 5, deposit: +t.deposit || 0, depositPaid: false, advanceRent: 0, advanceMonths: 0, brokerage: 0, maint: 0, maintType: 'None', elec: 'Actuals (sub-meter)', gstMode: 'RCM', tds: false, fitout: 0, registered: false, stamp: 0, clauses: `Franchise premises of ${pa.name}. TrustLab Diagnostics is not a party to this lease.`, status: 'Draft', docs: [] }, true)
  st.propertyId = P.id; st.leaseId = L.id; slog(st, `Premises ${P.code} and draft lease ${L.ref} set up in ${pa.name}’s TruSpace workspace`); await saveSite(st); drawDrawer()
}
export async function frOpen(id, fd) { const st = findSite(id); st.stage = 'Opened'; st.openedOn = fd.get('openedOn'); st.centreCode = fd.get('centreCode'); slog(st, `Franchise centre opened ${fmtD(st.openedOn)}${st.centreCode ? ' · ' + st.centreCode : ''}`); await saveSite(st, true); drawDrawer() }
export async function siteReject(id, fd, act) {
  const st = findSite(id); st.prevStage = siteStage(st); st.stage = act
  if (act === 'Rejected') st.rejectReason = fd.get('reason'); else st.holdReason = fd.get('reason')
  slog(st, `${act}: ${fd.get('reason')}`); await saveSite(st, true); drawDrawer()
}
export async function siteConvert(id, fd) {
  const st = findSite(id); const t = st.terms || {}
  let O = S.owners.find(o => o.name.trim().toLowerCase() === (st.ownerName || '').trim().toLowerCase())
  if (!O) O = await save('owners', { name: st.ownerName || 'Owner', kind: st.ownerKind || 'Individual', phone: st.ownerPhone || '', email: '', pan: '', gstin: '', address: '', bank: '', invPrefix: (st.ownerName || 'OWN').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase() }, true)
  const P = await save('properties', { code: fd.get('code').toUpperCase(), name: st.name, type: st.purpose, branch: fd.get('branch'), address: st.address || st.locality, city: st.city, state: st.state || 'Telangana', area: +(st.measuredArea || st.area) || 0, floors: st.floor || '', ownerId: O.id, status: 'Pipeline', meter: '', photos: (st.photos || []).slice(0, 6).concat((st.sign || {}).photos || [], st.frontVideos || []), frontPhoto: st.frontPhoto || null, earthing: Object.assign({}, st.earth || {}, { photos: undefined }), signage: Object.assign({}, st.sign || {}, { photos: undefined }), docs: [], siteId: st.id }, true)
  const start = t.start || TODAY
  const L = await save('leases', { ref: 'TDPL-FAC-LSE-' + String(S.leases.length + 1).padStart(3, '0'), propertyId: P.id, ownerId: O.id, start, end: addDays(addMonths(start, +t.term || 60), -1), lockIn: +t.lockIn || 0, notice: +t.notice || 3, noticeLessor: +t.noticeLessor || +t.notice || 3, rent: +t.rent, escPct: +t.escPct || 0, escEvery: +t.escEvery || 12, escType: 'Compound', escFrom: 'Lease start', payTiming: 'Advance', dueDay: 5, deposit: +t.deposit, depositPaid: false, advanceRent: +t.advance || 0, advanceMonths: t.advance ? 1 : 0, brokerage: +t.brokerage || 0, maint: +t.maint || 0, maintType: +t.maint ? 'Fixed monthly' : 'None', maintEsc: false, elec: 'Actuals (sub-meter)', gstMode: st.ownerGst === 'Registered' ? 'Forward' : 'RCM', tds: true, tdsOnMaint: false, fitout: +t.fitout || 0, registered: false, stamp: 0, clauses: `From site scouting ${st.code}. Owner works before handover: ${t.ownerWorks || '—'}`, status: 'Draft', docs: [] }, true)
  st.propertyId = P.id; st.leaseId = L.id; st.propCode = P.code; st.stage = 'Agreement'; slog(st, `Property ${P.code} and draft lease ${L.ref} created`); await saveSite(st)
  openDrawer({ kind: 'lease', id: L.id })
}
