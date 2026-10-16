/* Reference data ported verbatim from reference/TruSpace.html. */
export const COLS = ['properties', 'owners', 'leases', 'invoices', 'tickets', 'messages', 'inspections', 'sites', 'reqs', 'partners', 'tds', 'people']

export const TYPES = ['Laboratory', 'Collection centre', 'Hospital', 'Clinic', 'Polyclinic', 'Hospital lab (HLM)', 'Office', 'Warehouse / store', 'Staff accommodation']
export const SITE_PURPOSE = ['Laboratory', 'Collection centre', 'Hospital', 'Clinic', 'Polyclinic']
export const PSTAT = ['Pipeline', 'Under fit-out', 'Active', 'Notice served', 'Vacated']
export const INV_TYPES = ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other']
export const TCAT = ['Electrical wiring', 'Plumbing', 'Civil / structural', 'Seepage / roofing', 'Doors, windows & locks', 'Painting', 'Flooring & tiles', 'Shutters & grills', 'Other']
export const PRI = { P1: { l: 'P1 Critical', h: 4 }, P2: { l: 'P2 High', h: 24 }, P3: { l: 'P3 Normal', h: 72 }, P4: { l: 'P4 Low', h: 168 } }
export const TSTAT = ['Open', 'Assigned', 'In progress', 'Awaiting owner', 'Resolved', 'Closed']

/* Chip colour per status */
export const CHIP = {
  Active: 'ok', Paid: 'ok', Resolved: 'ok', Closed: 'idle', Verified: 'info', Approved: 'info', Submitted: 'warn', Overdue: 'bad', Rejected: 'bad',
  'Renewal due': 'warn', 'Notice period': 'warn', 'Notice served': 'warn', Expired: 'bad', Terminated: 'idle', Vacated: 'idle', Draft: 'idle', Pipeline: 'idle',
  'Under fit-out': 'info', Open: 'bad', Assigned: 'warn', 'In progress': 'info', 'Awaiting owner': 'warn', 'No lease': 'idle',
}
export const PRI_K = { P1: 'bad', P2: 'warn', P3: 'info', P4: 'idle' }

/* Navigation */
export const NAV_TDPL = [
  ['overview', 'Overview'], ['sites', 'Site scouting'], ['properties', 'Properties'], ['leases', 'Leases & contracts'], ['inspections', 'Take-over & handover'], ['invoices', 'Rent & invoices'], ['ledgers', 'Owner ledgers'], ['opening', 'Opening balances'], ['tds', 'TDS'],
  ['tickets', 'Repairs & tickets'], ['messages', 'Owner messages'], ['exits', 'Exits & terminations'], ['owners', 'Owners'], ['access', 'Portal access'],
]
export const NAV_OWNER = [['o-home', 'My properties'], ['o-me', 'My details'], ['o-docs', 'Agreements'], ['ledgers', 'Ledgers'], ['invoices', 'Invoices & payments'], ['tickets', 'Repairs & tickets'], ['inspections', 'Inspections'], ['messages', 'Messages']]
export const NAV_FR = [['sites', 'My locations']]
export const NAV_FR_FULL = [['sites', 'My locations'], ['overview', 'Premises overview'], ['properties', 'Premises'], ['leases', 'Leases & contracts'], ['inspections', 'Take-over & handover'], ['invoices', 'Rent & invoices'], ['ledgers', 'Owner ledgers'], ['opening', 'Opening balances'], ['tds', 'TDS'], ['tickets', 'Repairs & tickets'], ['messages', 'Owner messages'], ['exits', 'Exits & terminations'], ['owners', 'Owners']]

/* Exits */
export const EXIT_STEPS = ['Notice served', 'Joint inspection', 'Handover', 'Final settlement', 'Deposit refunded']

/* Ledgers */
export const LED_TABS = [['Rent', 'Rent'], ['Electricity', 'Electricity'], ['Maintenance', 'Maintenance'], ['Other', 'Other payments']]

/* Joint inspections — [key, label, type, photo required] */
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
export const CONDS = ['Good', 'Minor issue', 'Damaged', 'Missing', 'N/A']
export const BADC = c => ['Minor issue', 'Damaged', 'Missing'].includes(c)
export const IN_KIND = { 'Move-in': 'Take-over inspection', 'Move-out': 'Handover inspection' }
export const condK = c => ({ Good: 'ok', 'Minor issue': 'warn', Damaged: 'bad', Missing: 'bad', 'N/A': 'idle' }[c] || 'idle')
export const inspStatusK = s => ({ Signed: 'ok', 'Awaiting owner sign-off': 'warn', Disputed: 'bad', 'Not started': 'idle' }[s] || 'info')

/* Site scouting — [key, label, critical, photo required] */
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
export const svK = v => ({ Pass: 'ok', Concern: 'warn', Fail: 'bad', 'N/A': 'idle' }[v] || 'idle')
export const SITE_STAGES = ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved', 'Agreement', 'Take-over', 'Operational']
export const FR_STAGES = ['Scouted', 'Scrutiny', 'Shortlisted', 'Acceptance', 'Approved', 'Opened']
export const IN_PROG = ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved']
export const ACCEPTORS = [['ops', 'Business Head – Operations'], ['com', 'Business Head – Commercials']]
/* Catchment: [key, label, hint] */
export const CATCH = [
  ['hosp1', 'Hospitals within 1 km', 'Multi-speciality and general hospitals'], ['hosp3', 'Hospitals within 3 km', ''],
  ['nh1', 'Nursing homes within 1 km', ''], ['clin1', 'Doctor clinics / polyclinics within 1 km', 'Count GP, gynae, diabetology, paediatric'],
  ['res1', 'Residential units within 1 km', 'Flats + independent houses (estimate)'], ['gated1', 'Gated communities within 2 km', ''],
  ['offices1', 'Offices / IT parks within 2 km', 'Corporate wellness potential'], ['comp1', 'Competing labs & collection centres within 1 km', 'Name them in the case below'],
  ['footfall', 'Estimated daily footfall on the road', 'Pedestrians + vehicles stopping'],
]
/* Space plan: [key, label, unit, lab requirement, collection-centre requirement] */
export const SPACE = [
  ['reception', 'Reception & patient waiting', 'sq ft', 250, 150], ['seats', 'Waiting seats', 'nos', 16, 8],
  ['phlebo', 'Phlebotomy / sample-collection bays', 'nos', 3, 2], ['consult', 'Doctor / consultation room', 'nos', 1, 0],
  ['accession', 'Sample accessioning & sorting', 'sq ft', 150, 0], ['lab', 'Processing laboratory', 'sq ft', 1200, 0],
  ['cold', 'Cold room / refrigerator area', 'sq ft', 100, 20], ['store', 'Consumables store', 'sq ft', 200, 30],
  ['bmw', 'Biomedical-waste room', 'sq ft', 50, 20], ['ups', 'UPS & battery room', 'sq ft', 80, 15],
  ['it', 'Server / network & CCTV', 'sq ft', 40, 0], ['staff', 'Staff area & pantry', 'sq ft', 120, 40],
  ['toiletsP', 'Patient toilets', 'nos', 2, 1], ['toiletsS', 'Staff toilets', 'nos', 2, 1],
  ['park2', 'Two-wheeler parking', 'nos', 8, 4], ['park4', 'Car parking / sample-vehicle bay', 'nos', 2, 1],
  ['acUnits', 'A/C outdoor units that can be placed', 'nos', 8, 3], ['power', 'Power available / sanctioned', 'kW', 25, 5],
]
export const SPACE_ADJ = {
  Clinic: { reception: 200, seats: 12, phlebo: 1, consult: 2, cold: 10, park4: 2, power: 8, acUnits: 4 },
  Polyclinic: { reception: 400, seats: 30, phlebo: 2, consult: 5, cold: 20, store: 60, toiletsP: 3, toiletsS: 2, park2: 12, park4: 4, power: 15, acUnits: 8 },
  Hospital: { reception: 600, seats: 50, phlebo: 4, consult: 6, toiletsP: 6, toiletsS: 4, park2: 30, park4: 12, power: 80, acUnits: 20, store: 300, bmw: 100 },
}
export const SOILS = {
  'Black cotton soil': { k: 'warn', eff: 'Low resistance when moist, but shrinks and cracks in dry months and resistance rises sharply.', rec: 'Chemical (maintenance-free) electrodes with conductive backfill; seal pit tops so summer cracks do not open around the electrode.', water: 'Check moisture before summer; water conventional pits weekly in dry months.' },
  'Red soil': { k: 'warn', eff: 'Moderate to high resistance; drains quickly.', rec: 'Chemical electrodes with conductive backfill compound, about 3 m deep.', water: 'Water monthly in dry months; test before and after monsoon.' },
  'Laterite': { k: 'warn', eff: 'High resistance, porous and dries fast.', rec: 'Chemical electrodes with generous backfill, 3 m or deeper; plan one extra pit in parallel.', water: 'Water fortnightly in dry months.' },
  'Rocky / hard rock': { k: 'bad', eff: 'Very high resistance; hard to dig, so pits cost more.', rec: 'Bore earthing: drill 3–6 m or until a moist layer, chemical electrode with backfill; several pits in parallel to reach under 1 Ω. Budget for rock drilling.', water: 'Water does not help much; rely on backfill and parallel pits. Test quarterly.' },
  'Sandy': { k: 'warn', eff: 'High resistance; loses moisture quickly.', rec: 'Chemical electrodes with bentonite / backfill compound to hold moisture.', water: 'Water weekly in dry months; test quarterly.' },
  'Clay / alluvial': { k: 'ok', eff: 'Low resistance and holds moisture well.', rec: 'Conventional pipe or plate earthing works; chemical electrodes still preferred for analysers.', water: 'Water monthly in dry months; test before and after monsoon.' },
  'Murrum / gravel': { k: 'warn', eff: 'Moderate to high resistance.', rec: 'Chemical electrodes with conductive backfill, about 3 m deep.', water: 'Water fortnightly in dry months.' },
  'Filled / made-up ground': { k: 'bad', eff: 'Unpredictable — debris and voids give erratic readings.', rec: 'Measure soil resistivity before committing; go deeper than the fill to native soil.', water: 'Test quarterly until readings are stable.' },
}
export const PIT_LOC = ['Open soil inside the premises', 'Open soil in setback / compound', 'Only paved — core cutting needed', 'Common area — society permission needed', 'No space for new pits']
export const SIGN_LOC = ['Façade above entrance', 'Façade at first-floor level', 'Projecting (side) board', 'Pylon / totem at gate', 'Rooftop', 'Glass / window graphics', 'Not permitted']
export const verdictK = v => ({ Recommended: 'ok', Conditional: 'warn', 'Not recommended': 'bad', 'Deal-breaker': 'bad' }[v] || 'idle')
