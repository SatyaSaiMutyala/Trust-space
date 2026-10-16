/* Joint inspections (take-over / handover) — ported verbatim from reference/TruSpace.html. */
import { S, owner, prop, actor, save } from '../store/store'
import { CHECK, FIX_SEC, BADC, IN_KIND } from './constants'
import { by, nowISO, fmtD, fmtDT, inr, esc, daysTo } from './utils'
import { leaseState } from './lease'
import { fileUrl } from '../services/files'

let inspT = null
/** A record starts as "Not started" (date left blank — entered by hand) and becomes "In progress" once the date is entered or anything is recorded. */
export const INSP_OPEN = ['Not started', 'In progress']
export const inspOpen = I => !!I && INSP_OPEN.includes(I.status)
const inspStarted = I => (I.items || []).some(it => it.cond || String(it.val ?? '').trim() || (it.photos || []).length) || (I.roomPhotos || []).length || !!I.tdplVideo
export function saveInsp(I, now) { clearTimeout(inspT); if (I.status === 'Not started' && (I.date || inspStarted(I))) { I.status = 'In progress'; I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: `${IN_KIND[I.kind]} started` }) } I.updatedAt = nowISO(); if (now) return save('inspections', I, true); inspT = setTimeout(() => save('inspections', I, true), 700) }
/** Skipped inspections (no record exists — premises taken over / handed back before TruSpace): L.takeoverSkip / L.handoverSkip. */
export const skipKey = kind => kind === 'Move-out' ? 'handoverSkip' : 'takeoverSkip'
export const SKIP_NOTE_MIN = 30
export const inspOf = (leaseId, kind) => S.inspections.filter(i => i.leaseId === leaseId && i.kind === kind).sort(by('createdAt', -1))[0]
export function buildInspection(L, kind) {
  const prev = kind === 'Move-out' ? inspOf(L.id, 'Move-in') : null
  const pm = {}; (prev?.items || []).forEach(it => pm[it.k] = it)
  const items = []
  CHECK.forEach(sec => sec.items.forEach(([k, label, type, req]) => { const p = pm[k]; items.push({ k, sec: sec.s, label, type, req: !!req, cond: '', val: '', remark: '', photos: [], prev: p ? { cond: p.cond, val: p.val, remark: p.remark, photos: (p.photos || []).slice(0, 3) } : null }) }))
  ;(prev?.items || []).filter(it => it.type === 'fixture').forEach(p => items.push({ k: p.k, sec: FIX_SEC, label: p.label, type: 'fixture', req: false, qty: p.qty, cond: '', remark: '', photos: [], prev: { cond: p.cond, val: p.qty, remark: p.remark, photos: (p.photos || []).slice(0, 3) } }))
  return { kind, propertyId: L.propertyId, leaseId: L.id, ownerId: L.ownerId, date: '', inspector: '', ownerRep: owner(L.ownerId)?.name || '', items, roomPhotos: [], status: 'Not started', log: [{ at: nowISO(), by: actor(), text: `${IN_KIND[kind]} record created` }] }
}
/** Everything still missing before the TrustLab side can sign: [anchorKey, message][] */
export function inspProblems(I) {
  const out = []
  if (!I.date) out.push(['__head', 'Inspection date'])
  if (!(I.inspector || '').trim()) out.push(['__head', (prop(I.propertyId)?.managedBy === 'franchise' ? 'Franchise partner' : 'TrustLab') + ' inspector name'])
  if (!(I.ownerRep || '').trim()) out.push(['__head', 'Owner / representative name'])
  for (const it of I.items) {
    const bad = BADC(it.cond)
    if (it.type === 'cond' || it.type === 'fixture') { if (!it.cond) out.push([it.k, `${it.label}: condition not recorded`]); else if (bad && !(it.remark || '').trim()) out.push([it.k, `${it.label}: describe the issue`]) }
    if (it.type === 'fixture' && !(it.label || '').trim()) out.push([it.k, 'Fixture: name it'])
    if ((it.type === 'count' || it.type === 'reading') && String(it.val ?? '').trim() === '') out.push([it.k, `${it.label}: value not recorded`])
    if ((it.req || bad) && it.cond !== 'N/A' && !(it.photos || []).length) out.push([it.k, `${it.label}: photo required`])
    if (I.kind === 'Move-out' && bad && !it.resp) out.push([it.k, `${it.label}: choose who bears the cost`])
  }
  if ((I.roomPhotos || []).length < 4) out.push(['__room', `Area-wise photos: ${(I.roomPhotos || []).length} of minimum 4`])
  if (!I.tdplVideo) out.push(['__vid', 'Confirmation video by TrustLab employee'])
  return out
}
export const inspLocked = I => ['Awaiting owner sign-off', 'Signed'].includes(I.status)
export function inspSummary(I) { const flagged = I.items.filter(it => BADC(it.cond)); const ded = I.items.reduce((s, it) => s + (it.resp === 'TrustLab' ? (+it.deduct || 0) : 0), 0); return { flagged, ded } }

/** Owner signs: lock the record and, for a handover, carry agreed deductions into the exit settlement. */
export async function inspFinalise(I, name, method, paper) {
  I.status = 'Signed'; I.ownerSign = { name, at: nowISO(), method }; I.paper = (I.paper || []).concat(paper || []); delete I.dispute
  I.log = (I.log || []).concat({ at: nowISO(), by: actor(), text: `Signed by owner (${name}) — ${method}. Record locked.` })
  clearTimeout(inspT); await save('inspections', I) // the API's message confirms the signature
  if (I.kind === 'Move-out') {
    const L = S.leases.find(l => l.id === I.leaseId)
    if (L && L.exit) {
      const { flagged } = inspSummary(I)
      L.exit.stage = Math.max(L.exit.stage || 1, 2); L.exit.inspectionDate = I.date; L.exit.inspectionId = I.id
      L.exit.inspectionNotes = flagged.length ? flagged.map(it => `${it.label}: ${it.cond}${it.remark ? ' — ' + it.remark : ''} (${it.resp || '—'})`).join('\n') : 'No issues found at handover inspection.'
      L.exit.deductions = I.items.filter(it => it.resp === 'TrustLab' && +it.deduct).map(it => ({ desc: it.label, amount: +it.deduct }))
      const elec = I.items.find(it => it.k === 'm_elec'); if (elec && elec.val) L.exit.meterFinal = elec.val
      await save('leases', L, true)
    }
  }
}

/** Inspection items for the "Needs attention" list on the overview. */
export function inspAttention(items) {
  S.inspections.filter(i => i.status === 'Disputed').forEach(I => items.push({ k: 'bad', t: `Owner disputed ${IN_KIND[I.kind].toLowerCase()}`, s: `${prop(I.propertyId)?.name} · ${I.dispute || ''}`, a: { act: 'openInsp', id: I.id } }))
  S.inspections.filter(i => i.status === 'Awaiting owner sign-off').forEach(I => items.push({ k: 'info', t: `${IN_KIND[I.kind]} awaiting owner signature`, s: `${prop(I.propertyId)?.name} · submitted ${fmtDT(I.tdplSign?.at)}`, a: { act: 'openInsp', id: I.id } }))
  S.leases.forEach(L => {
    const st = leaseState(L); if (['Terminated', 'Expired'].includes(st)) return
    if (!inspOf(L.id, 'Move-in') && !L.takeoverSkip && daysTo(L.start) >= -90) items.push({ k: 'warn', t: 'Take-over inspection not done', s: `${prop(L.propertyId)?.name} · possession ${fmtD(L.start)}`, a: { act: 'newInsp', lease: L.id, kind: 'Move-in' } })
    if (L.exit?.noticeDate && (L.exit.stage || 0) < 2 && !inspOf(L.id, 'Move-out') && !L.handoverSkip) items.push({ k: 'warn', t: 'Schedule handover inspection with owner', s: `${prop(L.propertyId)?.name} · vacate by ${fmtD(L.exit.effective)}`, a: { act: 'newInsp', lease: L.id, kind: 'Move-out' } })
  })
}

/** Printable HTML report of an inspection. */
export function inspReport(I) {
  const P = prop(I.propertyId), O = owner(I.ownerId), L = S.leases.find(l => l.id === I.leaseId)
  const abs = u => u && u.startsWith('/') ? location.origin + u : u
  const secs = [...CHECK.map(c => c.s), FIX_SEC]
  const { flagged, ded } = inspSummary(I)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${IN_KIND[I.kind]} — ${esc(P?.code)}</title><style>body{font-family:Georgia,serif;max-width:900px;margin:30px auto;color:#1b1b1b;padding:0 16px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}h2{margin-top:26px}img{width:90px;height:90px;object-fit:cover;margin:2px;border:1px solid #ccc}.sig{display:inline-block;width:45%;margin-top:30px;border-top:1px solid #333;padding-top:6px}</style></head><body>
    <h1>${IN_KIND[I.kind]} report</h1><p><b>TrustLab Diagnostics Private Limited</b> · CIN U85100TG2020PTC143059</p>
    <p>Premises: ${esc(P?.name)} (${esc(P?.code)}), ${esc(P?.address)}, ${esc(P?.city)}<br>Owner: ${esc(O?.name)} · Lease ${esc(L?.ref)}<br>Date: ${fmtD(I.date)} · TrustLab inspector: ${esc(I.inspector)} · Owner representative: ${esc(I.ownerRep)}${I.present ? ' · Also present: ' + esc(I.present) : ''}</p>
    <p>Issues noted: ${flagged.length}${I.kind === 'Move-out' ? ` · Agreed deductions from deposit: ${inr(ded)}` : ''} · Status: ${esc(I.status)}</p>
    ${secs.map(s => { const its = I.items.filter(it => it.sec === s); if (!its.length) return ''; return `<h2>${esc(s)}</h2><table><thead><tr><th>Item</th>${I.kind === 'Move-out' ? '<th>At take-over</th>' : ''}<th>Condition / value</th><th>Remarks</th>${I.kind === 'Move-out' ? '<th>Cost</th>' : ''}<th>Photos</th></tr></thead><tbody>${its.map(it => `<tr><td>${esc(it.label)}${it.type === 'fixture' ? ' × ' + esc(it.qty || 1) : ''}</td>${I.kind === 'Move-out' ? `<td>${esc(it.prev?.cond || it.prev?.val || '—')}</td>` : ''}<td>${esc(it.cond || '')} ${esc(it.val ?? '')}</td><td>${esc(it.remark || '')}</td>${I.kind === 'Move-out' ? `<td>${BADC(it.cond) ? esc(it.resp || '') + (+it.deduct ? ' ' + inr(it.deduct) : '') : ''}</td>` : ''}<td>${(it.photos || []).map(f => `<img src="${esc(abs(fileUrl(f)))}" alt="">`).join('')}</td></tr>`).join('')}</tbody></table>` }).join('')}
    <h2>Area-wise photos</h2>${(I.roomPhotos || []).map(f => `<img src="${esc(abs(fileUrl(f)))}" alt="">`).join('')}
    <h2>Video confirmations</h2>${['tdpl', 'owner'].map(w => { const v = I[w + 'Video']; return `<p>${w === 'tdpl' ? 'TrustLab employee' : 'Owner'}: ${v ? `<a href="${esc(abs(fileUrl(v)))}">${esc(v.by || '')} · ${fmtDT(v.at)} · ${Math.round(v.dur || 0)} s</a>` : 'Not recorded'}</p>` }).join('')}
    <div><div class="sig">For TrustLab: ${esc(I.tdplSign?.name || '')}<br>${I.tdplSign ? fmtDT(I.tdplSign.at) : ''}</div> <div class="sig" style="float:right">Owner: ${esc(I.ownerSign?.name || '')}<br>${I.ownerSign ? fmtDT(I.ownerSign.at) + ' · ' + esc(I.ownerSign.method || '') : ''}</div></div>
  </body></html>`
}
