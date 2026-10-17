/* Design-matching sample data. Screens render from this until the API is wired (then the same shapes come from the server). */

export const staffUser = { initials: 'RT', name: 'Ravi Teja', team: 'Facilities', role: 'staff' };
export const ownerUser = { initials: 'MN', name: 'Narsimha garu', role: 'owner' };
export const franchiseUser = { name: 'Sai Krishna Diagnostics', role: 'franchise' };

export const overview = {
  date: 'Friday, 16 October',
  rentRoll: { month: 'October', amount: '₹18,42,000', leases: 36, sqft: '41,850', paidPct: 71, processPct: 19, overduePct: 10 },
  tiles: [
    { tone: 'amber', label: 'Payable to owners', value: '₹23,65,400', sub: '₹6,48,400 overdue', subTone: 'coral' },
    { tone: 'coral', label: 'Open repairs', value: '14', sub: '3 past SLA', subTone: 'coral' },
    { tone: 'mist', label: 'Deposits held', value: '₹1,92,00,000', sub: '36 leases' },
    { tone: 'blue', label: 'Site pipeline', value: '15', sub: '2 waiting for approval' },
  ],
  needs: [
    { n: 5, tone: 'amber', title: 'Invoices to approve', sub: '₹11,84,000, oldest 10 days', to: 'ToApprove' },
    { n: 3, tone: 'coral', title: 'Repairs past SLA', sub: 'Begumpet AC due in 5 h', to: 'TicketDetail' },
    { n: 2, tone: 'mist', title: 'Inspections to finish', sub: 'Wyra Road handover, 17 items left', to: 'InspectionItem' },
    { n: 1, tone: 'blue', title: 'Site to approve', sub: 'Siddipet Bus Stand Rd, ₹38,000', to: 'SiteEvaluation' },
  ],
  needsTotal: 11,
};

export const sections = {
  Premises: [
    { icon: 'rent-roll', title: 'Rent roll', sub: '36 leases', to: 'RentRoll' },
    { icon: 'building', title: 'Properties', sub: '38, 2 in fit-out', to: 'Properties' },
    { icon: 'map-pin', title: 'Site scouting', sub: '15 in pipeline', to: 'SiteScouting' },
    { icon: 'file-text', title: 'Leases', sub: '2 drafts', to: 'Leases' },
    { icon: 'file-list', title: 'Exits', sub: '2 in notice', to: 'Exits' },
    { icon: 'users', title: 'Owners', sub: '41, 2 without PAN', to: 'Owners' },
  ],
  Money: [
    { icon: 'file-check', title: 'Rent & invoices', sub: '7 waiting', subTone: 'amber', to: 'Invoices' },
    { icon: 'ledger', title: 'Owner ledgers', sub: 'FY 26-27', to: 'OwnerLedgers' },
    { icon: 'credit-card', title: 'TDS', sub: 'September late', subTone: 'coral', to: 'Tds' },
    { icon: 'calendar', title: 'Deposits', sub: '₹1,92,00,000 held', to: 'Deposits' },
  ],
};

const P = 'paid', O = 'overdue', R = 'rentFree', D = 'deposit', N = 'notInvoiced', U = 'upcoming', IP = 'process';
export const rentRoll = {
  fy: 'FY 26-27',
  months: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  filters: [{ label: 'All 36', key: 'all' }, { label: 'Overdue 4', key: 'overdue' }, { label: 'Not invoiced 3', key: 'ni' }, { label: 'Co-owned 7', key: 'co' }],
  rows: [
    { name: 'Begumpet Central Lab', rent: '₹4,80,000', co: true, cells: [P, P, P, P, P, P, { kind: 'coowners', label: '1/2' }, U, U, U, U, U] },
    { name: 'Dwaraka Nagar Lab', rent: '₹1,85,000', overdue: true, cells: [P, P, P, P, P, O, IP, U, U, U, U, U], selected: 5 },
    { name: 'Sector 18 CC, Karimnagar', rent: '₹95,000', cells: [P, P, P, P, P, P, N, U, U, U, U, U] },
    { name: 'Madhapur Polyclinic', rent: '₹2,10,000', cells: [R, R, R, R, P, P, IP, U, U, U, U, U] },
    { name: 'Wyra Road CC', rent: '₹42,000', co: true, cells: [P, P, P, P, P, D, D, U, U, U, U, U] },
    { name: 'Kukatpally CC', rent: '₹62,000', cells: [P, P, P, P, P, P, P, U, U, U, U, U] },
    { name: 'Karimnagar CC', rent: '₹38,000', overdue: true, cells: [P, P, P, P, O, O, N, U, U, U, U, U] },
    { name: 'Gachibowli Lab', rent: '₹3,40,000', co: true, cells: [P, P, P, P, P, P, IP, U, U, U, U, U] },
    { name: 'Uppal CC', rent: '₹48,000', cells: [P, P, P, P, P, P, N, U, U, U, U, U] },
    { name: 'Nizampet CC', rent: '₹55,000', overdue: true, cells: [P, P, P, P, P, O, IP, U, U, U, U, U] },
  ],
  selected: { title: 'Dwaraka Nagar Lab, Sep 26', owner: 'Sri Sai Estates', status: 'Overdue', rent: '₹1,85,000', where: 'Approved, payment 18 days late' },
};

export const property = {
  code: 'TLD-HYD-004', kind: 'Laboratory', name: 'Begumpet Central Lab', photos: 14,
  address: 'Begumpet, Hyderabad. Ground and 1st floor, 6,200 sq ft',
  chips: [{ label: 'Active', tone: 'teal' }, { label: '1 of 2 paid', tone: 'blue' }, { label: '1 open repair', tone: 'amber' }],
  tabs: ['Summary', 'Lease', 'Ledgers', 'Repairs', 'Inspections', 'Contracts'],
  tiles: [
    { tone: 'mist', label: 'Monthly rent', value: '₹4,80,000' }, { tone: 'grey', label: 'Deposit held', value: '₹28,80,000' },
    { tone: 'grey', label: 'Paid FY 26-27', value: '₹31,20,000' }, { tone: 'blue', label: 'Awaiting payment', value: '₹2,40,000' },
  ],
  owners: [
    { initials: 'KS', name: 'K. Srinivasa Rao', sub: '50%, GST 18%, PAN valid' },
    { initials: 'PR', name: 'P. Radhika', sub: '50%, GST 18%, PAN valid', tone: 'mist' },
  ],
  lease: [
    { label: 'Term', value: 'Dec 2023 – Nov 2028' }, { label: 'Escalation', value: '10% every 12 months' }, { label: 'Lock-in', value: '36 months' },
    { label: 'Notice period', value: '3 months' }, { label: 'Next escalation', value: '01 Dec 2026' }, { label: 'Rent-free', value: 'None' },
  ],
  repairs: [
    { code: 'T-2291', title: 'AC not cooling in the sample room', chip: 'P2 High', tone: 'amber', sub: 'In progress, 5 h 40 m left' },
    { code: 'T-2210', title: 'Reception light flickering', chip: 'Resolved', tone: 'teal', sub: 'Closed 02 Oct' },
  ],
  inspections: [
    { title: 'Take-over inspection', sub: 'Dec 2023, 48 items, signed by both', chip: 'Completed', tone: 'teal' },
    { title: 'Annual check', sub: 'Due Dec 2026', chip: 'Not started', tone: 'grey' },
  ],
  ledgers: [
    { label: 'Oct 26', value: '₹2,40,000', sub: 'K. Srinivasa Rao', chip: 'In process', tone: 'blue' },
    { label: 'Oct 26', value: '₹2,40,000', sub: 'P. Radhika', chip: 'Paid', tone: 'teal' },
    { label: 'Sep 26', value: '₹4,80,000', sub: 'Both owners', chip: 'Paid', tone: 'teal' },
  ],
};

export const site = {
  place: 'Karimnagar', name: 'Ramnagar main road', saved: 'Saved 12:41',
  chips: [{ label: 'Scrutiny', tone: 'blue' }, { label: 'Collection centre', tone: 'grey' }],
  steps: [{ label: 'Photos', done: true }, { label: 'Basics', done: true }, { label: 'Catchment', done: true }, { label: 'Space plan', current: true }, { label: 'Earthing' }, { label: 'Checklist' }],
  catchment: { index: 72, text: '3 hospitals and 11 clinics within 1 km. Dense housing, 2 labs nearby.' },
  tiles: [
    { label: 'Measured', value: '812', unit: 'sq ft', sub: '4.5% under quote', subTone: 'coral' },
    { label: 'Rent asked', value: '₹38,000', sub: '₹46.8 / sq ft', mono: true },
    { label: 'Frontage', value: '22', unit: 'ft', sub: 'Ground floor' },
  ],
  plan: { met: '5 of 7 met', rows: [
    { need: 'Reception & waiting', needed: 120, has: 140, ok: true }, { need: 'Sample collection', needed: 80, has: 96, ok: true },
    { need: 'Phlebotomy', needed: 60, has: 64, ok: true }, { need: 'Toilets', needed: 2, has: 2, ok: true },
    { need: 'Storage', needed: 40, has: 26, ok: false }, { need: 'Staff room', needed: 50, has: 48, ok: false }, { need: 'Parking', needed: 4, has: 4, ok: true },
  ] },
  todo: 'Still to do: earthing and 17 checklist items',
};

export const approvals = [
  { initials: 'KS', owner: 'K. Srinivasa Rao', sub: 'Begumpet Central Lab, 50% share', period: 'October 2026 rent, net payable', net: '₹2,59,200',
    rows: [{ label: 'Rent share', value: '₹2,40,000' }, { label: 'GST 18%', value: '+ ₹43,200' }, { label: 'TDS 10%', value: '– ₹24,000', coral: true }],
    checks: '4 checks passed', checksSub: 'Agreement, GSTIN, bank, no duplicate', note: 'Verified by Swathi P. on 6 Oct: “Checked against the agreement. OK to pay.”' },
  { initials: 'PR', owner: 'P. Radhika', sub: 'Begumpet Central Lab, 50% share', period: 'October 2026 rent, net payable', net: '₹2,59,200',
    rows: [{ label: 'Rent share', value: '₹2,40,000' }, { label: 'GST 18%', value: '+ ₹43,200' }, { label: 'TDS 10%', value: '– ₹24,000', coral: true }],
    checks: '4 checks passed', checksSub: 'Agreement, GSTIN, bank, no duplicate', note: 'Verified by Swathi P. on 6 Oct.' },
  { initials: 'SS', owner: 'Sri Sai Estates', sub: 'Dwaraka Nagar Lab', period: 'October 2026 rent, net payable', net: '₹1,96,100',
    rows: [{ label: 'Rent', value: '₹1,85,000' }, { label: 'GST 18%', value: '+ ₹33,300' }, { label: 'TDS 10%', value: '– ₹18,500', coral: true }],
    checks: '3 checks passed', checksSub: 'Agreement, GSTIN, bank', note: 'Verified by Swathi P. on 8 Oct.' },
  { initials: 'MN', owner: 'M. Narsimha', sub: 'Wyra Road CC, 50% share', period: 'October 2026 rent, from deposit', net: '₹18,900',
    rows: [{ label: 'Rent share', value: '₹21,000' }, { label: 'TDS 10%', value: '– ₹2,100', coral: true }],
    checks: '4 checks passed', checksSub: 'Agreement, deposit, bank, no duplicate', note: 'Owner agreed on 15 Oct.' },
  { initials: 'SN', owner: 'S. Narsimha', sub: 'Wyra Road CC, 50% share', period: 'October 2026 rent, from deposit', net: '₹18,900',
    rows: [{ label: 'Rent share', value: '₹21,000' }, { label: 'TDS 10%', value: '– ₹2,100', coral: true }],
    checks: '4 checks passed', checksSub: 'Agreement, deposit, bank, no duplicate', note: 'Owner agreed on 15 Oct.' },
];

export const ticket = {
  code: 'T-2291', property: 'Begumpet Central Lab', title: 'AC not cooling in the sample room',
  chips: [{ label: 'P2 High', tone: 'amber' }, { label: 'In progress', tone: 'blue' }, { label: "Owner's fixture", tone: 'grey' }],
  sla: { left: '5 h 40 m left', sub: '24-hour SLA ends 17 Oct, 09:15', value: 0.24 },
  steps: [{ label: 'Open', state: 'done' }, { label: 'Assigned', state: 'done' }, { label: 'In progress', state: 'current' }, { label: 'With owner', state: 'todo' }, { label: 'Resolved', state: 'todo' }, { label: 'Closed', state: 'todo' }],
  facts: [{ label: 'Who fixes it', value: 'Owner, via Cool Air Services' }, { label: 'Estimated cost', value: '₹14,500', mono: true }, { label: 'Paid by', value: 'K. Srinivasa Rao' }],
  updates: [
    { who: 'Ravi Teja', when: 'Today, 09:40', text: 'Technician confirmed for 15:00. Owner informed.' },
    { who: 'K. Srinivasa Rao', when: 'Yesterday, 18:12', text: 'Cool Air Services will send someone tomorrow.' },
    { who: 'System', when: 'Yesterday, 09:15', text: 'Ticket opened by Lab in-charge, assigned to Ravi Teja.' },
  ],
};

export const thread = {
  title: 'Wyra Road CC, Khammam', people: 'M. Narsimha, S. Narsimha', avatars: [{ initials: 'MN' }, { initials: 'SN' }],
  items: [
    { type: 'date', text: '30 Aug 2026' },
    { type: 'notice', title: 'Notice to vacate by 30 Nov 2026', text: "Three months' notice under clause 14.", file: 'Notice-KHM-002.pdf', meta: 'Ravi Teja, 11:02. Read by both owners' },
    { type: 'date', text: '14 Oct 2026' },
    { type: 'approval', title: 'Use deposit for Sep and Oct rent', text: '₹84,000. Deposit ₹2,52,000 → ₹1,68,000', meta: 'Both owners agreed by 15 Oct', status: 'Agreed' },
    { type: 'in', text: 'The shutter lock is jammed. Please send someone before the handover.', image: true, meta: 'M. Narsimha, 10:14' },
    { type: 'out', text: 'Thank you sir. Ticket T-2304 is raised, the technician comes tomorrow at 11.', meta: 'Ravi Teja, 10:31' },
  ],
};

export const tds = {
  fy: 'FY 26-27',
  tiles: [{ label: 'Deducted', value: '₹10,96,200', tone: 'grey' }, { label: 'Deposited', value: '₹9,11,600', tone: 'mist' }, { label: 'Overdue', value: '₹1,84,600', tone: 'coral' }],
  late: { title: 'September is 9 days late', toDeposit: '₹1,84,600', due: '07 Oct', interest: '₹2,769' },
  register: [
    { month: 'Oct 26', tag: 'so far', sub: 'Due 07 Nov', amount: '₹1,12,800', chip: 'Due', tone: 'amber' },
    { month: 'Aug 26', sub: 'Paid 05 Sep', amount: '₹1,84,200', chip: 'Deposited', tone: 'teal' },
    { month: 'Jul 26', sub: 'Paid 06 Aug', amount: '₹1,84,200', chip: 'Deposited', tone: 'teal' },
    { month: 'Jun 26', sub: 'Paid 09 Jul, interest ₹2,754', subTone: 'coral', amount: '₹1,83,600', chip: 'Late', tone: 'amber' },
    { month: 'May 26', sub: 'Paid 04 Jun', amount: '₹1,81,200', chip: 'Deposited', tone: 'teal' },
    { month: 'Apr 26', sub: 'Paid 06 May', amount: '₹1,80,400', chip: 'Deposited', tone: 'teal' },
  ],
  q2: { title: 'Q2 return due 31 Oct', sub: 'Not filed. Q1 Form 16A sent to 41 owners.' },
  challans: [{ month: 'Aug 26', sub: 'CIN 0004521 · 05 Sep', amount: '₹1,84,200' }, { month: 'Jul 26', sub: 'CIN 0004377 · 06 Aug', amount: '₹1,84,200' }, { month: 'Jun 26', sub: 'CIN 0004210 · 09 Jul', amount: '₹1,83,600' }],
  returns: [{ title: 'Q2 (Jul–Sep)', sub: 'Due 31 Oct', chip: 'Not filed', tone: 'amber' }, { title: 'Q1 (Apr–Jun)', sub: 'Filed 28 Jul, Form 16A sent', chip: 'Filed', tone: 'teal' }],
  pan: [{ name: 'K. Srinivasa Rao', sub: 'ABCPK1234F · verified', chip: 'Valid', tone: 'teal' }, { name: 'Sri Sai Estates', sub: 'No PAN on file · TDS at 20%', chip: 'Missing', tone: 'coral' }, { name: 'M. Narsimha', sub: 'AFZPM5521Q · verified', chip: 'Valid', tone: 'teal' }],
};

export const inspection = {
  title: 'Wyra Road handover', done: '31 of 48 done', group: 'Doors and shutters, item 3 of 5', item: 'Glass door, reception', takeover: 'Good', takeoverWhen: 'Dec 2023',
  segments: [1, 1, 1, 0.45, 0, 0, 0, 0],
  choices: ['Good', 'Minor issue', 'Damaged', 'Missing', 'Not applicable'],
  payers: [{ label: 'Wear and tear', value: 'wear' }, { label: 'Tenant, deposit', value: 'deposit' }, { label: 'Owner', value: 'owner' }],
  remark: '30 cm crack, lower left panel',
};

export const areas = {
  title: 'Wyra Road handover', steps: [{ label: 'Checklist', value: 1 }, { label: 'Photos', value: 0.75 }, { label: 'Videos', value: 0 }, { label: 'Sign-off', value: 0 }],
  tiles: [
    { state: 'photo', label: 'Front exterior' }, { state: 'photo', label: 'Reception' },
    { state: 'uploading', label: 'Phlebotomy room', progress: 0.62 }, { state: 'needed', label: 'Sample room', sub: 'Needed' },
    { state: 'optional', label: 'Toilets', sub: 'Optional' }, { state: 'add', label: 'Another area' },
  ],
  hint: 'One more photo needed: sample room',
};

export const video = {
  rec: 'REC 0:12', tenant: { title: 'Facilities', sub: 'Done, 0:38' }, owner: { title: 'Owner', sub: 'Recording' },
  prompt: 'Please read this aloud',
  text: '“I, M. Narsimha, owner of Wyra Road collection centre, was present for the handover inspection today, 16 October 2026, and have seen the checklist.”',
  limits: '5 s min\n2 min max',
};

export const signoff = {
  title: 'Wyra Road handover', steps: [{ label: 'Checklist', value: 1 }, { label: 'Photos', value: 1 }, { label: 'Videos', value: 1 }, { label: 'Sign-off', value: 0.5 }],
  summary: { items: '48 items checked', media: '4 photos, 2 videos', good: 38, minor: 6, damaged: 3, missing: 1 },
  damage: [
    { title: 'Glass door', sub: 'Good at take-over', chip: 'Deposit', tone: 'coral', amount: '₹6,500' },
    { title: 'Fan regulator', sub: 'Missing', chip: 'Deposit', tone: 'coral', amount: '₹450' },
    { title: 'Toilet cistern', sub: 'Leaking', chip: 'Owner', tone: 'grey', amount: '₹1,200' },
  ],
  fromDeposit: '₹6,950',
  signatures: { staff: { name: 'Facilities, Ravi Teja', sub: 'Signed at 12:58' }, owner: { initials: 'MN', name: 'Owner, M. Narsimha', sub: 'Signing on this phone' } },
};

export const ownerHome = {
  greeting: 'Namaskaram,', name: 'Narsimha garu',
  hero: { amount: '₹99,000', sub: 'coming to you by 7 Nov', value: 0.68, steps: [{ label: 'Sent', value: '3 Oct' }, { label: 'Checked', value: '6 Oct' }, { label: 'Approving', value: 'now', current: true }, { label: 'Paid', value: 'soon' }], note: 'October rent, Bypass Road Lab, after TDS' },
  todo: [
    { icon: 'pencil', title: 'Sign the handover check', sub: 'Wyra Road CC', to: 'OwnerCheckSign' },
    { icon: 'credit-card', title: 'Use deposit for Nov rent?', sub: 'Your share ₹21,000', to: 'DepositRequest' },
  ],
  year: [{ label: 'Received', value: '₹6,88,500' }, { label: 'TDS credited', value: '₹76,500' }],
  form16: { title: 'Download Form 16A', sub: 'Q1, Apr–Jun 2026' },
};

export const ownerInvoices = [
  { title: 'Oct 26 rent', sub: 'Bypass Road Lab', amount: '₹99,000', chip: 'In process', tone: 'blue' },
  { title: 'Sep 26 electricity', sub: 'Bypass Road Lab · 1,168 units', amount: '₹11,546', chip: 'Paid', tone: 'teal' },
  { title: 'Sep 26 rent', sub: 'Bypass Road Lab', amount: '₹99,000', chip: 'Paid', tone: 'teal' },
  { title: 'Oct 26 rent', sub: 'Wyra Road CC · from deposit', amount: '₹18,900', chip: 'Rent-free', tone: 'amber' },
];

export const newInvoice = {
  property: 'Bypass Road Lab', types: ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other'], month: 'Sep 26',
  last: '18,442', current: '19,610', rate: '₹9.50', fixed: '₹450', amount: '₹11,546', units: '1,168 units × ₹9.50 + ₹450',
};

export const ownerCheck = {
  intro: 'The facilities team checked Wyra Road CC with you today before handing it back on 30 Nov. Ravi Teja has signed.',
  fine: 38, issues: 10,
  deposit: [{ title: 'Glass door crack', sub: 'Reception', amount: '₹6,500' }, { title: 'Fan regulator missing', sub: 'Room 2', amount: '₹450' }],
  share: '₹3,475',
  owners: [{ title: 'Toilet cistern leaking', sub: 'About ₹1,200' }],
  wear: 'Normal wear, nobody pays: wall paint scuffs and 6 small items.',
};

export const depositRequest = {
  eyebrow: 'Wyra Road CC, notice period', title: "Use your deposit for November's rent?",
  body: "The tenant leaves on 30 Nov. Instead of paying November's rent, it asks to use the deposit you already hold.",
  share: '₹21,000', hold: '₹84,000 → ₹63,000', stays: 0.75,
  rows: [{ label: 'Your deposit at start', value: '₹1,26,000' }, { label: 'Used for Sep and Oct', value: '– ₹42,000' }, { label: 'Used for Nov, this request', value: '– ₹21,000' }, { label: 'Agreed damage', value: '– ₹3,475' }],
  refund: '₹59,525',
  parties: [{ name: 'You', chip: 'Waiting for you', tone: 'grey' }, { name: 'S. Narsimha', chip: 'Agreed', tone: 'teal' }],
};

export const locations = [
  { name: 'Siddipet Bus Stand Rd', sub: 'Collection centre, 640 sq ft', chip: 'Approved', tone: 'teal', progress: [1, 1, 1, 0], actions: ['Approval letter', 'Mark opened'] },
  { name: 'Kothagudem Main Rd', sub: 'Sent 08 Oct. Site visit 21 Oct', chip: 'Assessing', tone: 'blue', progress: [1, 1, 0, 0], tones: ['teal', 'blue'] },
  { name: 'Nizampet X Roads', sub: 'Add photos, measurements and why it suits', chip: 'Draft', tone: 'grey', draft: true, link: 'Continue' },
  { name: 'Jagtial Old Bus Stand', sub: '“Earth resistance is too high and there is no room for new pits.”', chip: 'Not approved', tone: 'coral' },
];

export const inspectionsList = [
  { title: 'Wyra Road handover', sub: 'Khammam · 31 of 48 done · owner present', chip: 'In progress', tone: 'blue', to: 'InspectionItem' },
  { title: 'Kukatpally CC take-over', sub: 'Due 18 Oct · 52 items', chip: 'Not started', tone: 'grey', to: 'AreaPhotos' },
  { title: 'Wyra Road handover, Electrical', sub: 'Saved on this phone · 2 photos waiting', chip: 'Offline', tone: 'amber', to: 'InspectionArea', params: { offline: true } },
  { title: 'Begumpet Central Lab annual', sub: 'Done 02 Oct · signed by both', chip: 'Completed', tone: 'teal', to: 'SignOff' },
];

export const repairsList = [
  { code: 'T-2291', title: 'AC not cooling in the sample room', sub: 'Begumpet Central Lab · 5 h 40 m left', chip: 'P2 High', tone: 'amber' },
  { code: 'T-2304', title: 'Shutter lock jammed', sub: 'Wyra Road CC · technician tomorrow 11:00', chip: 'P3 Normal', tone: 'blue' },
  { code: 'T-2288', title: 'Water leak in toilet', sub: 'Kukatpally CC · 2 days past SLA', chip: '1 past SLA', tone: 'coral' },
  { code: 'T-2279', title: 'Signboard light out', sub: 'Uppal CC · waiting for owner', chip: 'P4 Low', tone: 'grey' },
];

export const threadsList = [
  { avatars: [{ initials: 'MN' }, { initials: 'SN' }], title: 'Wyra Road CC, Khammam', sub: 'Thank you sir. Ticket T-2304 is raised…', when: '10:31', unread: 2 },
  { avatars: [{ initials: 'KS' }], title: 'Begumpet Central Lab', sub: 'Cool Air Services will send someone tomorrow.', when: 'Yesterday', unread: 1 },
  { avatars: [{ initials: 'SS' }], title: 'Dwaraka Nagar Lab', sub: 'Payment is delayed from our side, sorry.', when: 'Mon', unread: 3 },
  { avatars: [{ initials: 'SK', tone: 'mist' }], title: 'Sai Krishna Diagnostics', sub: 'Approval letter received. Opening on 1 Nov.', when: 'Sun' },
];

export const propertiesList = [
  { code: 'TLD-HYD-004', name: 'Begumpet Central Lab', sub: 'Laboratory · 6,200 sq ft', chip: 'Active', tone: 'teal' },
  { code: 'TLD-VSP-011', name: 'Dwaraka Nagar Lab', sub: 'Laboratory · 2,400 sq ft', chip: 'Overdue', tone: 'coral' },
  { code: 'TLD-KMM-002', name: 'Wyra Road CC', sub: 'Collection centre · 640 sq ft', chip: 'Terminated', tone: 'coral' },
  { code: 'TLD-HYD-019', name: 'Kukatpally CC', sub: 'Collection centre · 720 sq ft', chip: 'Fit-out', tone: 'blue' },
  { code: 'TLD-KNR-003', name: 'Sector 18 CC, Karimnagar', sub: 'Collection centre · 520 sq ft', chip: 'Active', tone: 'teal' },
];

export const ownersList = [
  { initials: 'KS', name: 'K. Srinivasa Rao', sub: 'Begumpet Central Lab · 50% · PAN valid' },
  { initials: 'SS', name: 'Sri Sai Estates', sub: 'Dwaraka Nagar Lab · no PAN, TDS 20%', chip: 'No PAN', tone: 'coral' },
  { initials: 'MN', name: 'M. Narsimha', sub: 'Wyra Road CC · 50% · PAN valid', tone: 'mist' },
  { initials: 'SN', name: 'S. Narsimha', sub: 'Wyra Road CC · 50% · PAN valid', tone: 'mist' },
];

export const leasesList = [
  { title: 'Begumpet Central Lab', sub: 'Dec 2023 – Nov 2028 · ₹4,80,000', chip: 'Active', tone: 'teal' },
  { title: 'Kukatpally CC', sub: 'Draft · ₹62,000 · starts 01 Nov', chip: 'Draft', tone: 'grey' },
  { title: 'Siddipet Bus Stand Rd', sub: 'Draft · ₹38,000', chip: 'Draft', tone: 'grey' },
];

export const exitsList = [
  { title: 'Wyra Road CC', sub: 'Notice served 30 Aug · vacate 30 Nov · handover in progress', chip: 'In notice', tone: 'amber' },
  { title: 'Madhapur Polyclinic', sub: 'Notice served 01 Oct · vacate 31 Dec', chip: 'In notice', tone: 'amber' },
];

export const sitesList = [
  { title: 'Ramnagar main road', sub: 'Karimnagar · collection centre', chip: 'Scrutiny', tone: 'blue', to: 'SiteEvaluation' },
  { title: 'Siddipet Bus Stand Rd', sub: 'Siddipet · 640 sq ft · ₹38,000', chip: 'To approve', tone: 'amber', to: 'SiteEvaluation' },
  { title: 'Kothagudem Main Rd', sub: 'Visit 21 Oct', chip: 'Assessing', tone: 'blue', to: 'SiteEvaluation' },
  { title: 'Jagtial Old Bus Stand', sub: 'Earth resistance too high', chip: 'Not approved', tone: 'coral', to: 'SiteEvaluation' },
];

export const invoicesList = [
  { title: 'K. Srinivasa Rao', sub: 'Begumpet Central Lab · Oct 26 rent', amount: '₹2,59,200', chip: 'To approve', tone: 'amber' },
  { title: 'Sri Sai Estates', sub: 'Dwaraka Nagar Lab · Sep 26 rent', amount: '₹1,96,100', chip: 'Overdue', tone: 'coral' },
  { title: 'P. Radhika', sub: 'Begumpet Central Lab · Oct 26 rent', amount: '₹2,59,200', chip: 'In process', tone: 'blue' },
  { title: 'M. Narsimha', sub: 'Wyra Road CC · Sep 26 electricity', amount: '₹11,546', chip: 'Paid', tone: 'teal' },
];

export const notifications = [
  { id: 'n1', icon: 'file-check', title: 'Invoice approved', sub: 'K. Srinivasa Rao, ₹2,59,200', when: 'Just now', tone: 'teal', read: false, to: 'ToApprove' },
  { id: 'n2', icon: 'wrench', title: 'T-2288 is past SLA', sub: 'Kukatpally CC water leak', when: '2 h ago', tone: 'coral', read: false, to: 'TicketDetail' },
  { id: 'n3', icon: 'message', title: 'M. Narsimha sent a photo', sub: 'Wyra Road CC · "The shutter lock is jammed…"', when: '10:14', tone: 'blue', read: false, to: 'Thread' },
  { id: 'n4', icon: 'credit-card', title: 'September TDS is 9 days late', sub: '₹1,84,600 to deposit, interest ₹2,769', when: 'Yesterday', tone: 'coral', read: true, to: 'Tds' },
  { id: 'n5', icon: 'inspect', title: 'Inspection saved offline', sub: 'Wyra Road handover · 14 changes waiting to upload', when: 'Yesterday', tone: 'amber', read: true, to: 'InspectionArea' },
  { id: 'n6', icon: 'map-pin', title: 'Site sent for approval', sub: 'Siddipet Bus Stand Rd, ₹38,000', when: 'Mon', tone: 'blue', read: true, to: 'SiteEvaluation' },
  { id: 'n7', icon: 'file-text', title: 'Lease renewal due', sub: 'Begumpet Central Lab · 120 days to end of term', when: 'Sun', tone: 'amber', read: true, to: 'PropertyDetail' },
  { id: 'n8', icon: 'users', title: 'New owner signed up', sub: 'P. Radhika · waiting for PAN and bank check', when: 'Sat', tone: 'grey', read: true },
];

export const offlineArea = {
  title: 'Wyra Road handover', area: 'Electrical', progress: 0.65,
  items: [
    { title: 'Earthing and DB panel', chip: 'Minor issue', tone: 'amber', photos: 2, sub: 'Saved on phone at 11:52' },
    { title: 'Meter reading', value: '18,442 kWh', chip: 'Good', tone: 'teal' },
    { title: 'Switches and sockets', sub: 'Not checked yet', chip: 'To do', tone: 'grey' },
  ],
};

/* ---- the six extra screens ---- */
export const challan = {
  month: 'September 2026', toDeposit: '₹1,84,600', interest: '₹2,769', total: '₹1,87,369', due: '07 Oct', daysLate: 9,
  banks: ['SBI, Begumpet', 'HDFC, Banjara Hills', 'ICICI, Madhapur'],
};

export const ticketForm = {
  properties: ['Begumpet Central Lab', 'Dwaraka Nagar Lab', 'Wyra Road CC', 'Kukatpally CC'],
  areas: ['Reception', 'Sample room', 'Phlebotomy', 'Toilets', 'Exterior', 'Electrical', 'Other'],
  priorities: [
    { label: 'P1 Critical, 4 h', value: 'P1', tone: 'coral' }, { label: 'P2 High, 24 h', value: 'P2', tone: 'amber' },
    { label: 'P3 Normal, 72 h', value: 'P3', tone: 'blue' }, { label: 'P4 Low, 7 days', value: 'P4', tone: 'grey' },
  ],
  fixers: [{ label: 'Tenant', value: 'tenant' }, { label: 'Owner', value: 'owner' }, { label: 'Not sure', value: 'unsure' }],
};

export const siteForm = {
  towns: ['Karimnagar', 'Siddipet', 'Kothagudem', 'Nizampet', 'Jagtial'],
  types: ['Collection centre', 'Laboratory', 'Polyclinic'],
  floors: ['Ground floor', '1st floor', 'Ground + 1st'],
};

export const ownerLedger = {
  fy: 'FY 26-27', property: 'Bypass Road Lab',
  tiles: [{ label: 'Received', value: '₹6,88,500', tone: 'mist' }, { label: 'TDS credited', value: '₹76,500', tone: 'grey' }, { label: 'Coming', value: '₹99,000', tone: 'blue' }],
  rows: [
    { month: 'Oct 26', sub: 'Rent · due 7 Nov', amount: '₹99,000', chip: 'In process', tone: 'blue' },
    { month: 'Sep 26', sub: 'Electricity · paid 12 Oct', amount: '₹11,546', chip: 'Paid', tone: 'teal' },
    { month: 'Sep 26', sub: 'Rent · paid 6 Oct · TDS ₹11,000', amount: '₹99,000', chip: 'Paid', tone: 'teal' },
    { month: 'Aug 26', sub: 'Rent · paid 5 Sep · TDS ₹11,000', amount: '₹99,000', chip: 'Paid', tone: 'teal' },
    { month: 'Jul 26', sub: 'Rent · paid 7 Aug · TDS ₹11,000', amount: '₹99,000', chip: 'Paid', tone: 'teal' },
    { month: 'Jun 26', sub: 'Rent · paid 6 Jul · TDS ₹11,000', amount: '₹99,000', chip: 'Paid', tone: 'teal' },
  ],
};

export const agreements = [
  { group: 'Bypass Road Lab', items: [
    { title: 'Lease agreement', sub: 'Signed 01 Dec 2023 · PDF, 2.4 MB', icon: 'file-text' },
    { title: 'Annexure A, fit-out scope', sub: 'Signed 01 Dec 2023 · PDF, 1.1 MB', icon: 'file-text' },
    { title: 'Take-over inspection report', sub: '04 Dec 2023 · PDF, 6.8 MB · 48 photos', icon: 'file-check' },
  ] },
  { group: 'Wyra Road CC', items: [
    { title: 'Lease agreement', sub: 'Signed 15 Mar 2024 · PDF, 2.1 MB', icon: 'file-text' },
    { title: 'Notice to vacate', sub: '30 Aug 2026 · PDF, 0.3 MB', icon: 'file', chip: 'In notice', tone: 'amber' },
  ] },
  { group: 'Tax', items: [
    { title: 'Form 16A, Q1 2026-27', sub: 'Apr–Jun 2026 · TDS ₹33,000', icon: 'download' },
    { title: 'Form 16A, Q4 2025-26', sub: 'Jan–Mar 2026 · TDS ₹30,000', icon: 'download' },
  ] },
];

export const ownerDetails = {
  initials: 'MN', name: 'M. Narsimha', phone: '98480 21734', email: 'narsimha.m@gmail.com', address: '4-21, Wyra Road, Khammam 507001',
  pan: { number: 'AFZPM5521Q', chip: 'Valid', tone: 'teal' },
  gst: { number: 'Not registered', chip: 'No GST', tone: 'grey' },
  bank: { name: 'State Bank of India', account: '•••• •••• 4471', ifsc: 'SBIN0003412', chip: 'Verified', tone: 'teal' },
  properties: ['Bypass Road Lab, 100%', 'Wyra Road CC, 50%'],
};

/* ---- sign-up ---- */
export const signupLists = {
  kinds: ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust'],
  states: ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Odisha', 'Chhattisgarh', 'Kerala', 'Delhi', 'Gujarat'],
  contact: ['Call', 'WhatsApp', 'Email'],
  callHours: ['Morning, 9–12', 'Afternoon, 12–4', 'Evening, 4–7'],
  banks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Union Bank of India', 'Canara Bank', 'Bank of Baroda', 'Kotak Mahindra Bank', 'Andhra Bank', 'Other'],
  acctTypes: ['Savings', 'Current'],
  relations: ['Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Manager', 'CA', 'Other'],
};
