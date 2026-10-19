/* Joint inspections (take-over at possession, handover at exit): the checklist, what a record looks like, what is still
   missing before sign-off and the summary counts. Used by the web app, the API and the phone app. Pure functions. */

/* Checklist — [key, label, type, photo required]. type: cond (condition chips), count, reading, fixture. */
export const CHECK = [
  { s: 'Keys & access', items: [['k_main', 'Main entrance keys (count)', 'count', 1], ['k_shutter', 'Rolling shutter keys (count)', 'count', 1], ['k_internal', 'Internal door keys — all rooms (count)', 'count', 0], ['k_cards', 'Access cards / remotes (count)', 'count', 0]] },
  { s: 'Meters & utility dues', items: [['m_elec', 'Electricity meter reading (kWh)', 'reading', 1], ['m_load', 'Sanctioned load as per latest bill (kW)', 'reading', 0], ['m_water', 'Water meter reading', 'reading', 0], ['u_supply', 'Water supply — municipal / borewell working', 'cond', 0], ['u_tank', 'Sump and overhead tank clean, lids intact', 'cond', 1], ['u_dues', 'Electricity and water bills paid to date (bill copy photographed)', 'cond', 1]] },
  { s: 'Structure & civil', items: [['c_walls', 'Walls — no cracks, dampness or seepage', 'cond', 1], ['c_ceiling', 'Ceiling and slab — no cracks or leakage marks', 'cond', 1], ['c_floor', 'Flooring and tiles — no cracked, hollow or loose tiles', 'cond', 1], ['c_terrace', 'Terrace waterproofing and rainwater outlets', 'cond', 1], ['c_stairs', 'Staircase, railings and ramps', 'cond', 0], ['c_ext', 'External façade and compound wall', 'cond', 1]] },
  { s: 'Doors, windows & shutters', items: [['d_main', 'Main door, frame and locks', 'cond', 1], ['d_int', 'Internal doors, handles and stoppers', 'cond', 0], ['d_win', 'Windows, glass panes and mesh', 'cond', 0], ['d_grill', 'Grills and safety bars', 'cond', 0], ['d_shutter', 'Rolling shutter — operates smoothly, locks', 'cond', 1]] },
  { s: 'Electrical — building wiring', items: [['e_db', 'Main distribution board, MCBs and RCCB', 'cond', 1], ['e_earth', 'Earthing — earth pit and continuity', 'cond', 0], ['e_points', 'Switches, sockets and light points', 'cond', 0], ['e_wiring', 'Wiring concealed — no exposed joints or burn marks', 'cond', 1]] },
  { s: 'Plumbing & sanitary', items: [['p_wash', 'Washrooms — WC, flush, washbasin', 'cond', 1], ['p_taps', 'Taps and fittings — no leaks', 'cond', 0], ['p_drain', 'Drains and floor traps flowing freely', 'cond', 0], ['p_lines', 'Visible water lines and valves — no leaks', 'cond', 0]] },
  { s: 'Finish & cleanliness', items: [['f_paint_in', 'Interior paint', 'cond', 1], ['f_paint_out', 'Exterior paint and signage area', 'cond', 0], ['f_clean', 'Premises clean, debris removed', 'cond', 1], ['f_pest', 'No pest or termite activity', 'cond', 0]] },
  { s: 'Safety & common areas', items: [['s_exit', 'Fire exit / escape route clear', 'cond', 0], ['s_parking', 'Allotted parking as per lease', 'cond', 0], ['s_common', 'Common area and lobby access', 'cond', 0]] },
]
export const FIX_SEC = 'Fixtures & fittings provided by owner'
export const INSP_SECTIONS = CHECK.map(c => c.s).concat(FIX_SEC)
export const CONDS = ['Good', 'Minor issue', 'Damaged', 'Missing', 'N/A']
export const BADC = c => ['Minor issue', 'Damaged', 'Missing'].includes(c)
export const IN_KIND = { 'Move-in': 'Take-over inspection', 'Move-out': 'Handover inspection' }
export const condK = c => ({ Good: 'ok', 'Minor issue': 'warn', Damaged: 'bad', Missing: 'bad', 'N/A': 'idle' }[c] || 'idle')
export const inspStatusK = s => ({ Signed: 'ok', 'Awaiting owner sign-off': 'warn', Disputed: 'bad', 'Not started': 'idle' }[s] || 'info')
/** Who bears the cost of a handover defect: value stored on the item → label. 'TrustLab' = the tenant, deducted from the deposit. */
export const RESP = [['Fair wear & tear', 'Fair wear & tear — no deduction'], ['TrustLab', 'Tenant — deduct from deposit'], ['Owner', 'Owner — pre-existing / owner scope']]
export const inspLocked = I => ['Awaiting owner sign-off', 'Signed'].includes(I.status)

/** Fresh checklist items for a new record; a handover carries the take-over's values and fixtures as `prev`. */
export function inspectionItems(prevItems) {
  const pm = {}; (prevItems || []).forEach(it => { pm[it.k] = it })
  const items = []
  CHECK.forEach(sec => sec.items.forEach(([k, label, type, req]) => { const p = pm[k]; items.push({ k, sec: sec.s, label, type, req: !!req, cond: '', val: '', remark: '', photos: [], prev: p ? { cond: p.cond, val: p.val, remark: p.remark, photos: (p.photos || []).slice(0, 3) } : null }) }))
  ;(prevItems || []).filter(it => it.type === 'fixture').forEach(p => items.push({ k: p.k, sec: FIX_SEC, label: p.label, type: 'fixture', req: false, qty: p.qty, cond: '', remark: '', photos: [], prev: { cond: p.cond, val: p.qty, remark: p.remark, photos: (p.photos || []).slice(0, 3) } }))
  return items
}

/** One item is "recorded" once it has a condition, or a value for counts and readings. */
export const itemDone = it => ((it.type === 'count' || it.type === 'reading') ? String(it.val ?? '').trim() !== '' : !!it.cond)
/** { done, total } over the checklist. */
export const inspProgress = I => { const items = I.items || []; return { done: items.filter(itemDone).length, total: items.length } }
/** An item still needs a photo: required items, and anything flagged, unless marked N/A. */
export const itemNeedsPhoto = it => (it.req || BADC(it.cond)) && it.cond !== 'N/A' && !(it.photos || []).length

/** Everything still missing before the tenant's side can sign: [anchorKey, message][]. tenant = 'TrustLab' | 'Franchise partner' (inspector label). */
export function inspProblems(I, { tenant = 'TrustLab' } = {}) {
  const out = []
  if (!I.date) out.push(['__head', 'Inspection date'])
  if (!(I.inspector || '').trim()) out.push(['__head', `${tenant} inspector name`])
  if (!(I.ownerRep || '').trim()) out.push(['__head', 'Owner / representative name'])
  for (const it of I.items || []) {
    const bad = BADC(it.cond)
    if (it.type === 'cond' || it.type === 'fixture') { if (!it.cond) out.push([it.k, `${it.label}: condition not recorded`]); else if (bad && !(it.remark || '').trim()) out.push([it.k, `${it.label}: describe the issue`]) }
    if (it.type === 'fixture' && !(it.label || '').trim()) out.push([it.k, 'Fixture: name it'])
    if ((it.type === 'count' || it.type === 'reading') && String(it.val ?? '').trim() === '') out.push([it.k, `${it.label}: value not recorded`])
    if (itemNeedsPhoto(it)) out.push([it.k, `${it.label}: photo required`])
    if (I.kind === 'Move-out' && bad && !it.resp) out.push([it.k, `${it.label}: choose who bears the cost`])
  }
  if ((I.roomPhotos || []).length < 4) out.push(['__room', `Area-wise photos: ${(I.roomPhotos || []).length} of minimum 4`])
  if (!I.tdplVideo) out.push(['__vid', `Confirmation video by the ${tenant === 'Franchise partner' ? 'partner' : 'facilities'} team`])
  return out
}

/** Flagged items, agreed deductions (handover) and the condition counts for the sign-off summary. */
export function inspSummary(I) {
  const items = I.items || []
  const flagged = items.filter(it => BADC(it.cond))
  const ded = items.reduce((s, it) => s + (it.resp === 'TrustLab' ? (+it.deduct || 0) : 0), 0)
  const counts = { good: 0, minor: 0, damaged: 0, missing: 0, na: 0 }
  items.forEach(it => { if (it.cond === 'Good') counts.good++; else if (it.cond === 'Minor issue') counts.minor++; else if (it.cond === 'Damaged') counts.damaged++; else if (it.cond === 'Missing') counts.missing++; else if (it.cond === 'N/A') counts.na++ })
  return { flagged, ded, counts, photos: items.reduce((s, it) => s + (it.photos || []).length, 0) + (I.roomPhotos || []).length, videos: (I.tdplVideo ? 1 : 0) + (I.ownerVideo ? 1 : 0) }
}

/** Progress of the four phone steps (checklist, area photos, videos, sign-off) as 0–1 each. */
export function inspSteps(I) {
  const p = inspProgress(I)
  return [
    { label: 'Checklist', value: p.total ? p.done / p.total : 0 },
    { label: 'Photos', value: Math.min(1, (I.roomPhotos || []).length / 4) },
    { label: 'Videos', value: ((I.tdplVideo ? 1 : 0) + (I.ownerVideo ? 1 : 0)) / 2 },
    { label: 'Sign-off', value: I.status === 'Signed' ? 1 : I.tdplSign ? 0.5 : 0 },
  ]
}
