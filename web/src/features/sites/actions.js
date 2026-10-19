/* Site scouting page actions (prototype ACT.siteMode … frEnable and SUBMIT.req / SUBMIT.partner). Site-drawer actions live in siteDrawer/. */
import { S, UI, emit, save, toast, openDrawer, closeDrawer, drawDrawer, partner, role, isFranchisee, frScope } from '../../store/store'
import { reqLoc, reqState, slog } from '../../domain/site'
import { TODAY, newId, num } from '../../domain/utils'

export const siteMode = m => { UI.siteMode = m; emit() }
export const newReq = () => openDrawer({ kind: 'req' })
export const editReq = id => openDrawer({ kind: 'req', id })
export function reqFilter(id) {
  const f = UI.filt.s || {}
  UI.filt.s = Object.assign({}, f, f.req === id ? { req: '' } : { req: id, loc: reqLoc(S.reqs.find(r => r.id === id)) }); emit()
}
export function newSite(rid) {
  rid = rid || UI.filt.s?.req; const fsc = frScope(); const r = S.reqs.find(x => x.id === rid && (!fsc || fsc.has(x.id)))
  if (!r) {
    const open = S.reqs.filter(x => (!fsc || fsc.has(x.id)) && !['Finalised', 'Cancelled'].includes(reqState(x).v))
    if (open.length === 1) return newSite(open[0].id)
    toast(open.length ? 'Choose the requirement this site is for — use “Add scouted site” on its card.' : isFranchisee() ? 'TrustLab has not opened a location brief for you yet.' : 'Start with a requirement: location and what we are setting up.', 'warning')
    if (!open.length && !isFranchisee()) openDrawer({ kind: 'req' })
    return
  }
  const n = S.sites.length + 1
  const st = { id: newId(), reqId: r.id, code: 'SITE-' + String(n).padStart(3, '0'), name: '', locality: r.area, city: r.city, state: r.state, purpose: r.purpose, stage: 'Scouted', scoutedOn: TODAY, scoutedBy: isFranchisee() ? (partner(role().partnerId)?.name || 'Franchise partner') : '', photos: [], checks: {}, terms: { escPct: 5, escEvery: 12, lockIn: 24, notice: 3, noticeLessor: 3, term: 60, fitout: 30 }, log: [] }
  slog(st, 'Site added'); save('sites', st, true); openDrawer({ kind: 'site', id: st.id })
}
export const partners = () => openDrawer({ kind: 'partners' })
export async function frEnable(id) { const pa = partner(id); pa.premisesMgmt = true; await save('partners', pa); drawDrawer() }
export const newPartner = () => openDrawer({ kind: 'partner' })
export const editPartner = id => openDrawer({ kind: 'partner', id })

/* ---------- SUBMIT ---------- */
export async function submitReq(id, fd) {
  const old = id ? S.reqs.find(x => x.id === id) : { code: 'REQ-' + String(S.reqs.length + 1).padStart(3, '0'), status: 'Open', raisedOn: TODAY }
  if (fd.get('model') === 'Franchise' && !fd.get('partnerId')) { toast('Choose the franchise partner.', 'warning'); return }
  const r = Object.assign({}, old, Object.fromEntries(['city', 'state', 'area', 'purpose', 'reason', 'target', 'priority', 'raisedBy', 'musts', 'model', 'partnerId', 'scoutBy'].map(k => [k, (fd.get(k) || '').trim()])), { areaMin: num(fd.get('areaMin')), areaMax: num(fd.get('areaMax')), rentMax: num(fd.get('rentMax')) })
  if (fd.get('status')) r.status = fd.get('status')
  await save('reqs', r); closeDrawer(); UI.filt.s = Object.assign({}, UI.filt.s, { loc: reqLoc(r), req: r.id }); emit()
}
export async function submitPartner(id, fd) {
  const old = id ? partner(id) : {}
  const pa = Object.assign({}, old, Object.fromEntries(['name', 'contact', 'phone', 'email', 'city', 'model', 'agreementRef', 'status', 'notes'].map(k => [k, (fd.get(k) || '').trim()])), { premisesMgmt: !!fd.get('premisesMgmt') })
  await save('partners', pa); openDrawer({ kind: 'partners' })
}
