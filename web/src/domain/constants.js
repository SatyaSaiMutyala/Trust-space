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
  ['tickets', 'Repairs & tickets'], ['messages', 'Owner messages'], ['exits', 'Exits & terminations'], ['owners', 'Owners'], ['access', 'Portal access'], ['trash', 'Trash'],
]
export const NAV_OWNER = [['o-home', 'My properties'], ['o-me', 'My details'], ['o-docs', 'Agreements'], ['ledgers', 'Ledgers'], ['invoices', 'Invoices & payments'], ['tickets', 'Repairs & tickets'], ['inspections', 'Inspections'], ['messages', 'Messages'], ['trash', 'Trash']]
export const NAV_FR = [['sites', 'My locations']]
export const NAV_FR_FULL = [['sites', 'My locations'], ['overview', 'Premises overview'], ['properties', 'Premises'], ['leases', 'Leases & contracts'], ['inspections', 'Take-over & handover'], ['invoices', 'Rent & invoices'], ['ledgers', 'Owner ledgers'], ['opening', 'Opening balances'], ['tds', 'TDS'], ['tickets', 'Repairs & tickets'], ['messages', 'Owner messages'], ['exits', 'Exits & terminations'], ['owners', 'Owners'], ['trash', 'Trash']]

/* Exits */
export const EXIT_STEPS = ['Notice served', 'Joint inspection', 'Handover', 'Final settlement', 'Deposit refunded']

/* Ledgers */
export const LED_TABS = [['Rent', 'Rent'], ['Electricity', 'Electricity'], ['Maintenance', 'Maintenance'], ['Other', 'Other payments']]

/* Joint inspections — checklist and helpers shared with the API and the phone app */
export { CHECK, FIX_SEC, CONDS, BADC, IN_KIND, condK, inspStatusK } from '@calc/inspection.js'

/* Site scouting — [key, label, critical, photo required] */
export { SITE_CHECK, SITE_ITEMS } from '@calc/site.js' // shared with the API and the phone app
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
