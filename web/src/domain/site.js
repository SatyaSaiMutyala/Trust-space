/* Site scouting, due diligence and franchise — ported verbatim from reference/TruSpace.html. */
import { S, partner, actor, save } from '../store/store'
import { SPACE, SPACE_ADJ, SOILS, SITE_ITEMS, SITE_CHECK, CATCH, ACCEPTORS } from './constants'
import { TODAY, nowISO, fmtD, inr, esc } from './utils'
import { inspOf } from './inspection'
import { fileUrl } from '../services/files'

export const spaceStd = (purpose, k) => { const row = SPACE.find(x => x[0] === k); const adj = (SPACE_ADJ[purpose] || {})[k]; if (adj !== undefined) return adj; return ['Laboratory', 'Hospital'].includes(purpose) ? row[3] : row[4] }
export const spaceReq = (st, k) => { const custom = (st.spaceReq || {})[k]; return custom !== undefined && custom !== '' ? +custom : spaceStd(st.purpose, k) }
export function spaceStatus(st) {
  const av = st.space || {}; let met = 0, filled = 0, need = 0; const short = []
  SPACE.forEach(([k, l]) => { const rq = spaceReq(st, k); if (!rq) return; need++; if (av[k] === undefined || av[k] === '') return; filled++; if (+av[k] >= rq) met++; else short.push(l) })
  return { met, need, filled, short }
}
export function earthPlan(st) {
  const e = st.earth || {}; const soil = SOILS[e.soil]; const lab = ['Laboratory', 'Hospital'].includes(st.purpose)
  const need = lab ? 3 : 2; const have = +e.pitsPossible || 0
  return {
    soil, need, have, short: e.pitsPossible !== undefined && e.pitsPossible !== '' && have < need,
    text: `${lab ? '3 dedicated pits: 2 for analysers / instruments and 1 for UPS neutral' : '2 dedicated pits: 1 for equipment and 1 for UPS neutral'}, plus the building body earth. Target under 1 Ω with neutral–earth voltage under 2 V.`,
  }
}
export function catchIndex(st) {
  const c = st.catch || {}; const n = k => +c[k] || 0
  const filled = ['hosp3', 'clin1', 'res1', 'comp1'].every(k => c[k] !== undefined && c[k] !== '')
  if (!filled) return { idx: 0, filled: false, parts: {} }
  const cap = (v, m) => Math.min(1, v / m)
  const parts = { Medical: Math.round(30 * (0.5 * cap(n('hosp3'), 5) + 0.2 * cap(n('hosp1') + n('nh1'), 3) + 0.3 * cap(n('clin1'), 20))), Residential: Math.round(30 * (0.75 * cap(n('res1'), 5000) + 0.25 * cap(n('gated1'), 5))), Corporate: Math.round(10 * cap(n('offices1'), 5)), Visibility: Math.round(15 * cap(n('footfall'), 3000)), Competition: Math.max(0, 15 - 3 * n('comp1')) }
  return { idx: Object.values(parts).reduce((a, b) => a + b, 0), filled: true, parts }
}
export const CATCH_MAX = { Medical: 30, Residential: 30, Corporate: 10, Visibility: 15, Competition: 15 }

export const reqLoc = r => `${r.city} – ${r.area}`
export const reqOf = st => S.reqs.find(r => r.id === st.reqId)
export const siteLoc = st => { const r = reqOf(st); return r ? reqLoc(r) : `${st.city} – ${st.locality}` }
export const isFr = st => reqOf(st)?.model === 'Franchise'

export function siteStage(st) {
  if (st.stage === 'Rejected' || st.stage === 'On hold') return st.stage
  if (st.leaseId && !isFr(st)) { const L = S.leases.find(l => l.id === st.leaseId); if (!L || L.status === 'Draft') return 'Agreement'; const mi = inspOf(L.id, 'Move-in'); return mi && mi.status === 'Signed' ? 'Operational' : 'Take-over' }
  return st.stage || 'Scouted'
}
export function siteScore(st) {
  const ch = st.checks || {}; let got = 0, max = 0, done = 0, conc = 0; const crit = [], secs = {}
  SITE_ITEMS.forEach(it => {
    const v = ch[it.k]?.v; const w = it.crit ? 2 : 1; const sc = secs[it.sec] = secs[it.sec] || { got: 0, max: 0 }
    if (v) done++; if (!v || v === 'N/A') return; max += w; sc.max += w; const g = v === 'Pass' ? w : v === 'Concern' ? w / 2 : 0; got += g; sc.got += g
    if (v === 'Fail' && it.crit) crit.push(it); if (v === 'Concern') conc++
  })
  const pct = max ? Math.round(got / max * 100) : 0
  const verdict = crit.length ? 'Deal-breaker' : !done ? 'Not assessed' : pct >= 80 ? 'Recommended' : pct >= 60 ? 'Conditional' : 'Not recommended'
  return { pct, done, total: SITE_ITEMS.length, crit, conc, secs, verdict }
}
/** Everything still missing before a site can be shortlisted: [anchorKey, message][] */
export function siteProblems(st) {
  const out = []; const ch = st.checks || {}
  SITE_ITEMS.forEach(it => {
    const c = ch[it.k] || {}
    if (!c.v) out.push([it.k, `${it.label.split(' — ')[0]}: not assessed`])
    else {
      if (['Concern', 'Fail'].includes(c.v) && !(c.remark || '').trim()) out.push([it.k, `${it.label.split(' — ')[0]}: explain the ${c.v.toLowerCase()}`])
      if (it.ph && c.v !== 'N/A' && !(c.photos || []).length) out.push([it.k, `${it.label.split(' — ')[0]}: photo required`])
    }
  })
  const ci = catchIndex(st); if (!ci.filled) out.push(['__catch', 'Catchment: hospitals (3 km), clinics, residential units and competitors'])
  if (!((st.catch || {}).case || '').trim()) out.push(['__catch', 'Catchment: write why this location suits a diagnostics centre'])
  if (!st.frontPhoto) out.push(['__front', 'Front-view photo of the building (used as the property picture)'])
  const sg = st.sign || {}; if (!sg.loc) out.push(['__sign', 'Name board: where it can go']); else if (sg.loc !== 'Not permitted') { if (!(+sg.w && +sg.h)) out.push(['__sign', 'Name board: size in feet']); if (!(sg.photos || []).length) out.push(['__sign', 'Name board: photo of the board position']) }
  const e = st.earth || {}; if (!e.soil) out.push(['__earth', 'Earthing: soil type']); if (e.pitsPossible === undefined || e.pitsPossible === '') out.push(['__earth', 'Earthing: how many new pits are possible']); if (!e.pitLoc) out.push(['__earth', 'Earthing: where new pits can go']); if (!e.access) out.push(['__earth', 'Earthing: maintenance access']); if (e.resist === undefined || e.resist === '') out.push(['__earth', 'Earthing: existing resistance (enter 0 if no pit exists)'])
  const sp = spaceStatus(st); if (sp.filled < sp.need) out.push(['__space', `Space plan: ${sp.need - sp.filled} requirement(s) not measured`])
  if ((st.photos || []).length < 3) out.push(['__site', `Site photos: ${(st.photos || []).length} of minimum 3 (front, inside, approach road)`])
  return out
}
export const rentPsf = st => { const a = +st.measuredArea || +st.area; const r = +(st.terms?.rent) || +st.quotedRent; return a && r ? r / a : 0 }

let siteT = null
export function saveSite(st, now) { clearTimeout(siteT); if (now) return save('sites', st, true); siteT = setTimeout(() => save('sites', st, true), 700) }
export function slog(st, text) { st.log = (st.log || []).concat({ at: nowISO(), by: actor(), text }) }

export function reqState(r) {
  const sites = S.sites.filter(st => st.reqId === r.id); const fin = sites.find(st => ['Agreement', 'Take-over', 'Operational', 'Approved', 'Opened'].includes(siteStage(st)) && (isFr(st) || siteStage(st) !== 'Approved'))
  if (r.status === 'Cancelled') return { v: 'Cancelled', k: 'idle', fin }; if (fin) return { v: 'Finalised', k: 'ok', fin }; if (!sites.length) return { v: 'Not started', k: 'warn', fin }; return { v: 'Scouting', k: 'info', fin }
}

/** Franchise location-approval letter (HTML download). */
export function frLetter(st) {
  const rq = reqOf(st); const pa = partner(rq?.partnerId); const sc = siteScore(st); const ci = catchIndex(st)
  return `<!doctype html><html><head><meta charset="utf-8"><title>Location approval — ${esc(st.name)}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;color:#1b1b1b;padding:0 16px;line-height:1.55}h1{font-size:22px}td{padding:4px 10px 4px 0;vertical-align:top}.note{font-size:13px;color:#444;border-top:1px solid #ccc;padding-top:10px;margin-top:24px}</style></head><body>
  <p><b>TrustLab Diagnostics Private Limited</b><br>#31, Street No. 5, Prakash Nagar, Begumpet, Hyderabad – 500016 · CIN U85100TG2020PTC143059</p>
  <p>Ref: ${esc(st.code)}/${esc(rq?.code || '')} · Date: ${fmtD(st.approval?.at || TODAY)}</p>
  <p>To<br><b>${esc(pa?.name || 'Franchise partner')}</b>${pa?.contact ? '<br>Attn: ' + esc(pa.contact) : ''}</p>
  <h1>Location approval — ${esc(rq?.purpose === 'Laboratory' ? 'franchise laboratory' : 'franchise collection centre')}</h1>
  <p>TrustLab has assessed the premises below for suitability as a ${esc((rq?.purpose || '').toLowerCase())} under your franchise with us, and approves the location subject to the conditions listed.</p>
  <table><tr><td>Premises</td><td><b>${esc(st.name)}</b>, ${esc(st.address || '')}, ${esc(st.locality)}, ${esc(st.city)}</td></tr><tr><td>Area</td><td>${esc(st.measuredArea || st.area)} sq ft, ${esc(st.floor || '')}</td></tr><tr><td>Assessment</td><td>Checklist ${sc.pct}% (${esc(sc.verdict)}) · catchment index ${ci.idx}/100</td></tr><tr><td>Name board</td><td>${esc(st.sign?.loc || '—')}${st.sign?.w ? `, ${st.sign.w} × ${st.sign.h} ft` : ''}</td></tr></table>
  <p><b>Conditions before opening</b><br>${esc(st.frConditions || 'As per TrustLab franchise standards.').replace(/\n/g, '<br>')}</p>
  <p>This approval is valid for ${esc(st.frValidity || 90)} days. Please share the signed lease, the completed fit-out photos and the opening date in TruSpace.</p>
  <p class="note">TrustLab is not a party to the lease or any agreement between the franchise partner and the property owner, and accepts no obligation for rent, deposit, repairs or any other liability under it. This approval relates only to the suitability of the location for TrustLab-branded services.</p>
  <p style="margin-top:40px">For TrustLab Diagnostics Private Limited<br><br>Authorised signatory</p></body></html>`
}

/** Full site evaluation report (HTML download). */
export function siteReport(st) {
  const sc = siteScore(st); const ch = st.checks || {}; const t = st.terms || {}
  const abs = u => u && u.startsWith('/') ? location.origin + u : u
  const sg = st.sign || {}, e = st.earth || {}, ep = earthPlan(st)
  return `<!doctype html><html><head><meta charset="utf-8"><title>Site evaluation — ${esc(st.name)}</title><style>body{font-family:Georgia,serif;max-width:900px;margin:30px auto;color:#1b1b1b;padding:0 16px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}img{width:80px;height:80px;object-fit:cover;margin:2px}.f{color:#b42318;font-weight:bold}.c{color:#a15c07}</style></head><body>
  <h1>Site evaluation — ${esc(st.name)}</h1><p>TrustLab Diagnostics Private Limited · ${esc(st.code)} · ${esc(siteStage(st))}</p>
  <p>${esc(st.address || '')}, ${esc(st.locality)}, ${esc(st.city)}<br>Use: ${esc(st.purpose)} · ${esc(st.floor || '')} · quoted ${esc(st.area)} sq ft, measured ${esc(st.measuredArea || '—')} sq ft · frontage ${esc(st.frontage || '—')} ft<br>Owner: ${esc(st.ownerName || '')} (${esc(st.ownerKind || '')}, GST ${esc(st.ownerGst || '—')}) · Scouted by ${esc(st.scoutedBy || '')} on ${fmtD(st.scoutedOn)}</p>
  <h2>Location &amp; catchment — index ${catchIndex(st).idx}/100</h2><table>${CATCH.map(([k, l]) => `<tr><td>${esc(l)}</td><td>${esc((st.catch || {})[k] ?? '—')}</td></tr>`).join('')}</table><p><b>Why this location:</b> ${esc((st.catch || {}).case || '—')}</p>
  <h2>Name board &amp; signage</h2><p>${esc(sg.loc || '—')} · ${esc(sg.w || '—')} × ${esc(sg.h || '—')} ft · ${esc(sg.lit || '')} · visible ${esc(sg.vis || '—')} · permission: ${esc(sg.perm || '—')}<br>${esc(sg.extra || '')} ${esc(sg.obs ? 'Obstructions: ' + sg.obs : '')}</p>${(sg.photos || []).map(f => `<img src="${esc(abs(fileUrl(f)))}">`).join('')}
  <h2>Earthing</h2><p>Soil: ${esc(e.soil || '—')} ${esc(e.soilNote || '')}<br>Existing: ${esc(e.pitsExisting ?? '—')} pit(s), ${esc(e.pitType || '')}, ${esc(e.resist ?? '—')} Ω, N–E ${esc(e.nev ?? '—')} V<br>New pits possible: ${esc(e.pitsPossible ?? '—')} (${esc(e.pitLoc || '')}) · access: ${esc(e.access || '—')} · maintained by ${esc(e.maintBy || '—')}<br>Suggested: ${esc(ep.soil?.rec || '')} ${esc(ep.text)}</p>
  <h2>Space plan</h2><table><tr><th>Requirement</th><th>Needed</th><th>Available</th></tr>${SPACE.map(([k, l, u]) => `<tr><td>${esc(l)} (${u})</td><td>${spaceReq(st, k)}</td><td>${esc((st.space || {})[k] ?? '—')}</td></tr>`).join('')}</table><p>${esc(st.otherReq || '')}</p>
  ${st.frontPhoto ? `<h2>Front view</h2><img src="${esc(abs(fileUrl(st.frontPhoto)))}" style="width:320px;height:200px">` : ''}
  <h2>Checklist score ${sc.pct}% — ${sc.verdict}</h2><p>${sc.done}/${sc.total} items assessed · ${sc.conc} concerns · ${sc.crit.length} critical failures</p>
  <h2>Commercials</h2><p>Quoted rent ${inr(st.quotedRent)} · deposit asked ${inr(st.quotedDeposit)}<br>Agreed rent ${inr(t.rent)} (₹${rentPsf(st).toFixed(1)}/sq ft) · deposit ${inr(t.deposit)} · term ${esc(t.term || '—')} months · lock-in ${esc(t.lockIn || '—')} · escalation ${esc(t.escPct || 0)}% every ${esc(t.escEvery || '—')} months · rent-free ${esc(t.fitout || 0)} days<br>Owner works: ${esc(t.ownerWorks || '—')}</p>
  ${SITE_CHECK.map(sec => `<h2>${esc(sec.s)}</h2><table>${SITE_ITEMS.filter(it => it.sec === sec.s).map(it => { const c = ch[it.k] || {}; return `<tr><td>${esc(it.label)}${it.crit ? ' <b>(critical)</b>' : ''}</td><td class="${c.v === 'Fail' ? 'f' : c.v === 'Concern' ? 'c' : ''}">${esc(c.v || 'Not assessed')}</td><td>${esc(c.remark || '')}</td><td>${(c.photos || []).map(f => `<img src="${esc(abs(fileUrl(f)))}">`).join('')}</td></tr>` }).join('')}</table>`).join('')}
  <h2>Site photos</h2>${(st.photos || []).map(f => `<img src="${esc(abs(fileUrl(f)))}">`).join('')}
  ${Object.keys(st.accept || {}).length ? `<p>${ACCEPTORS.map(([k, l]) => (st.accept[k] && st.accept[k].ok) ? `Accepted by ${esc(st.accept[k].name)}, ${l}, ${fmtD(st.accept[k].at)}` : `${l}: pending`).join('<br>')}</p>` : ''}
  ${st.approval ? `<p><b>Approved by ${esc(st.approval.by)}</b> on ${fmtD(st.approval.at)}. ${esc(st.approval.note || '')}</p>` : ''}</body></html>`
}
