/*
 * Site scouting maths shared by the web, the API and the phone: the due-diligence checklist definition, the catchment
 * index and the checklist score. Pure functions over a site record ({ checks, catch, … }).
 */
export const SITE_CHECK = [
  { s: 'Location & catchment', items: [
    ['l_cluster', 'Within reach of hospitals, nursing homes and doctor clinics (referral cluster)', 0, 0],
    ['l_road', 'Main-road frontage and visibility from passing traffic', 0, 1],
    ['l_sign', 'Façade signage and glow-sign allowed by owner and society', 0, 1],
    ['l_transport', 'Public transport and auto access for patients', 0, 0],
    ['l_competition', 'Competing labs and collection centres nearby — name them in remarks', 0, 0],
    ['l_flood', 'No waterlogging or flooding history in monsoon (ask neighbours)', 1, 0]] },
  { s: 'Access & parking', items: [
    ['a_ground', 'Ground floor, or lift with ramp / wheelchair access for patients', 1, 1],
    ['a_parking', 'Patient parking and two-wheeler parking for phlebotomists', 0, 1],
    ['a_vehicle', 'Sample pick-up and courier vehicle access at all hours', 1, 0],
    ['a_247', '24×7 operation permitted by owner and society — no night restrictions', 1, 0],
    ['a_service', 'Separate service entry for samples, supplies and biomedical waste', 0, 1]] },
  { s: 'Building & structure', items: [
    ['b_use', 'Commercial use permitted — zoning, occupancy certificate or approved plan', 1, 0],
    ['b_struct', 'Structurally sound — no major cracks or settlement', 1, 1],
    ['b_damp', 'No seepage, dampness or roof leakage', 1, 1],
    ['b_height', 'Clear ceiling height of at least 10 ft for ducting and false ceiling', 0, 0],
    ['b_load', 'Floor can take analysers, UPS batteries and cold-storage load', 0, 0],
    ['b_fire', 'Fire exit / staircase and space for extinguishers', 1, 1],
    ['b_termite', 'No termite or pest infestation', 0, 0]] },
  { s: 'Electrical & earthing', items: [
    ['e_load', 'Sanctioned load adequate or enhancement possible (processing lab ≥ 25 kW, collection centre ≥ 5 kW)', 1, 1],
    ['e_3ph', 'Three-phase supply available (mandatory for processing labs)', 1, 1],
    ['e_earth', 'Dedicated earth pits possible; earth resistance under 1 Ω and neutral–earth voltage under 2 V', 1, 1],
    ['e_pitspace', 'Open soil (not concrete or paved) for at least 2 additional earth pits', 1, 1],
    ['e_soil', 'Soil type suits earthing, or chemical / bore earthing is planned (see Earthing assessment)', 0, 0],
    ['e_maint', 'Earth pits accessible for watering and periodic testing (inspection chambers)', 0, 1],
    ['e_meter', 'Separate energy meter for TrustLab premises', 0, 1],
    ['e_quality', 'Stable voltage and few power cuts in the area', 0, 0],
    ['e_backup', 'Space for DG (or building DG share) and a ventilated UPS-battery area', 1, 1],
    ['e_wiring', 'Existing wiring and distribution board in good condition, or owner to rewire', 0, 1]] },
  { s: 'Water & plumbing', items: [
    ['w_supply', '24×7 water supply — municipal and/or borewell', 1, 0],
    ['w_quality', 'Water quality fit as RO feed for analysers (TDS checked, value in remarks)', 0, 0],
    ['w_storage', 'Sump and overhead tank capacity adequate', 0, 1],
    ['w_points', 'Plumbing points possible at lab sinks, RO plant and phlebotomy hand-wash', 0, 0],
    ['w_drain', 'Drainage can take lab wash water; no blocked or back-flowing lines', 1, 1]] },
  { s: 'Toilets & hygiene', items: [
    ['t_patient', 'Patient toilet close to the collection area (urine / stool sample collection)', 1, 1],
    ['t_staff', 'Separate staff toilets, gender-segregated', 0, 1],
    ['t_access', 'Accessible toilet for elderly and wheelchair users', 0, 0],
    ['t_vent', 'Toilets ventilated with exhaust; no odour into patient areas', 0, 0]] },
  { s: 'A/C & ventilation', items: [
    ['h_outdoor', 'Space for A/C outdoor units — terrace, ledge or wall — with owner and society permission', 1, 1],
    ['h_access', 'Safe access to outdoor units for servicing, without going through a neighbour’s premises', 1, 1],
    ['h_pipe', 'Copper piping route within 15 m and core-cutting permitted', 0, 0],
    ['h_drain', 'Route available for A/C condensate drain', 0, 0],
    ['h_heat', 'Lab area can be cooled 24×7 (heat load, west-facing glass, insulation)', 0, 0],
    ['h_exhaust', 'Exhaust and fresh-air provision for lab and biomedical-waste room', 0, 0]] },
  { s: 'Space & layout', items: [
    ['s_area', 'Measured carpet area matches the quoted area (record measured area in remarks)', 1, 1],
    ['s_flow', 'Layout fits reception, waiting, phlebotomy, processing, store and cold room', 1, 0],
    ['s_segregate', 'Patient areas can be separated from lab and sample processing', 0, 0],
    ['s_bmw', 'Space for a biomedical-waste storage room with separate access', 1, 1],
    ['s_light', 'Natural light and ventilation in patient areas', 0, 0]] },
  { s: 'IT & connectivity', items: [
    ['n_fibre', 'Two broadband / fibre providers available', 0, 0],
    ['n_mobile', 'Good mobile signal for phlebotomy apps and payment terminals', 0, 0],
    ['n_rack', 'Space for network rack and CCTV recorder', 0, 0]] },
  { s: 'Statutory & neighbourhood', items: [
    ['r_noc', 'Society and neighbours have no objection to a diagnostic centre', 1, 0],
    ['r_pcb', 'Pollution board consent and biomedical-waste authorisation feasible at this address', 1, 0],
    ['r_firenoc', 'Fire NOC feasible for the built-up area and use', 0, 0]] },
  { s: 'Title & owner', items: [
    ['o_title', 'Title verified — sale deed, encumbrance certificate, mutation', 1, 0],
    ['o_tax', 'Property tax and utility bills paid to date', 0, 1],
    ['o_loan', 'No disputes; a mortgaged property has the bank’s NOC for leasing', 1, 0],
    ['o_coowners', 'All co-owners willing to sign; power of attorney verified if a representative signs', 1, 0],
    ['o_register', 'Owner willing to register the lease', 0, 0],
    ['o_works', 'Owner agrees to finish agreed civil and electrical works before handover', 0, 0]] },
  { s: 'Commercials', items: [
    ['c_rent', 'Rent per sq ft within market range for the locality', 1, 0],
    ['c_deposit', 'Deposit, lock-in and escalation acceptable under TrustLab policy', 0, 0],
    ['c_fitout', 'Rent-free fit-out period offered', 0, 0]] },
]
export const SITE_ITEMS = SITE_CHECK.flatMap(sec => sec.items.map(([k, label, crit, ph]) => ({ k, label, crit: !!crit, ph: !!ph, sec: sec.s })))

export const SV = ['Pass', 'Concern', 'Fail', 'N/A']
export const SITE_STAGES = ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved', 'Agreement', 'Take-over', 'Operational']
export const CATCH_MAX = { Medical: 30, Residential: 30, Corporate: 10, Visibility: 15, Competition: 15 }

/** Catchment index 0–100 from the counts around the site (hospitals, clinics, homes, offices, footfall, competitors). */
export function catchIndex(st) {
  const c = st.catch || {}; const n = k => +c[k] || 0
  const filled = ['hosp3', 'clin1', 'res1', 'comp1'].every(k => c[k] !== undefined && c[k] !== '')
  if (!filled) return { idx: 0, filled: false, parts: {} }
  const cap = (v, m) => Math.min(1, v / m)
  const parts = { Medical: Math.round(30 * (0.5 * cap(n('hosp3'), 5) + 0.2 * cap(n('hosp1') + n('nh1'), 3) + 0.3 * cap(n('clin1'), 20))), Residential: Math.round(30 * (0.75 * cap(n('res1'), 5000) + 0.25 * cap(n('gated1'), 5))), Corporate: Math.round(10 * cap(n('offices1'), 5)), Visibility: Math.round(15 * cap(n('footfall'), 3000)), Competition: Math.max(0, 15 - 3 * n('comp1')) }
  return { idx: Object.values(parts).reduce((a, b) => a + b, 0), filled: true, parts }
}

/** Checklist score: % of weighted points, items done, critical fails, concerns, per-section totals and a verdict. */
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
