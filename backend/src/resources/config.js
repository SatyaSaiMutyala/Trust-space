/*
 * One entry per API resource (= MongoDB collection). The generic CRUD controller reads this to build
 * search, filters, sorting, validation, reference checks and human-readable messages.
 *
 *   path         URL segment: /api/<path>
 *   singular /   words used in messages ("3 properties found", "Property “X” updated")
 *   plural
 *   label        record → display name used in messages
 *   search       fields matched by ?search= (case-insensitive, partial)
 *   filters      query params that filter by exact value; comma-separated values match any (?status=Paid,Approved)
 *                type: 'string' (default) | 'bool' | 'number'
 *   dateField    field used by ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   sort         default sort { field: 1 | -1 }; ?sort=<field>&order=asc|desc overrides
 *   required     [field, label] that must be present on create / replace
 *   enums        field → allowed values
 *   numbers      fields that must be numeric when present
 *   refs         field → resource path the value must exist in (checked when present)
 *   unique       field groups that must be unique, e.g. [['code']] or [['ownerId', 'number']]
 *   dependents   [resource path, field or [fields], word] — blocks delete while dependent records exist
 *   writeRoles   roles allowed to create, change or delete (default: everyone who can see the record)
 *   view         (record, user) → record as that user may see it
 *   indexes      extra fields to index (filters with a computed `build` are not indexed automatically)
 * More complex rules (co-owners, deposit adjustments, opening balances, TDS) live in resources/checks.js.
 */
const DONE_INV = ['Paid', 'Rejected']
const DONE_TKT = ['Resolved', 'Closed']
const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, server local time

export const RESOURCES = [
  {
    path: 'properties', model: 'Property', singular: 'property', plural: 'properties',
    label: r => r.name || r.code,
    search: ['name', 'code', 'city', 'state', 'address', 'branch', 'type'],
    filters: { status: {}, type: {}, city: {}, state: {}, ownerId: {}, managedBy: {}, partnerId: {}, branch: {} },
    sort: { name: 1 },
    required: [['name', 'Property name'], ['code', 'Site code'], ['address', 'Address'], ['city', 'City']],
    enums: { status: ['Pipeline', 'Under fit-out', 'Active', 'Notice served', 'Vacated'] },
    numbers: ['area'],
    refs: { ownerId: 'owners', partnerId: 'partners' },
    unique: [['code']],
    indexes: ['owners.ownerId'],
    dependents: [['leases', 'propertyId', 'lease'], ['tickets', 'propertyId', 'ticket'], ['invoices', 'propertyId', 'invoice']],
  },
  {
    path: 'owners', model: 'Owner', singular: 'owner', plural: 'owners',
    label: r => r.name,
    search: ['name', 'phone', 'email', 'pan', 'gstin', 'addr.city', 'bankName'],
    filters: { kind: {}, partnerId: {}, bankVerified: { type: 'bool' }, bankPending: { type: 'bool' }, prefContact: {}, panStatus: {} },
    sort: { name: 1 },
    required: [['name', 'Owner name']],
    labels: { kind: 'Owner type', panStatus: 'PAN status', party: 'Owner or co-share' },
    // party: Owner = on the agreement; Co-share = paid a share of the rent (TDS on their PAN) but not on the agreement, no invoice, no GST
    enums: { kind: ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust'], panStatus: ['Valid', 'Inoperative', 'Not verified', ''], party: ['Owner', 'Co-share', ''] },
    refs: { partnerId: 'partners' },
    dependents: [['properties', 'ownerId', 'property'], ['leases', ['ownerId', 'owners.ownerId'], 'lease']], // incl. leases where they are a co-owner
  },
  {
    path: 'leases', model: 'Lease', singular: 'lease', plural: 'leases',
    label: r => r.ref,
    search: ['ref', 'clauses'],
    filters: { propertyId: {}, ownerId: { build: v => ({ $or: [{ ownerId: v }, { 'owners.ownerId': v }] }) }, status: {}, gstMode: {}, payTiming: {}, registered: { type: 'bool' } }, // ownerId also matches co-owners
    dateField: 'start',
    sort: { start: -1 },
    required: [['ref', 'Lease reference'], ['propertyId', 'Property'], ['start', 'Lease start date'], ['end', 'Lease end date'], ['rent', 'Monthly rent']],
    labels: { status: 'Agreement status' },
    enums: { status: ['Draft', 'Active'], gstMode: ['Forward', 'RCM', 'None'], payTiming: ['Advance', 'Arrears'] },
    numbers: ['rent', 'deposit', 'escPct', 'escAdd', 'escEvery', 'lockIn', 'lockInLessor', 'notice', 'noticeLessor', 'fitout', 'maint', 'advanceRent', 'advanceMonths', 'brokerage', 'stamp', 'dueDay'],
    refs: { propertyId: 'properties', ownerId: 'owners' },
    unique: [['ref']],
    indexes: ['ownerId', 'owners.ownerId'],
    dependents: [['invoices', 'leaseId', 'invoice'], ['inspections', 'leaseId', 'inspection']],
  },
  {
    path: 'invoices', model: 'Invoice', singular: 'invoice', plural: 'invoices',
    label: r => r.number,
    search: ['number', 'desc', 'type', 'utr', 'period'],
    filters: {
      propertyId: {}, leaseId: {}, ownerId: {}, type: {}, status: {}, period: {}, source: {}, paidBy: {},
      open: { type: 'bool', build: v => ({ status: v ? { $nin: DONE_INV } : { $in: DONE_INV } }) }, // not yet paid / rejected
      overdue: { type: 'bool', build: v => v ? { status: { $nin: DONE_INV }, dueDate: { $lt: today() } } : { $or: [{ status: { $in: DONE_INV } }, { dueDate: { $gte: today() } }] } },
    },
    dateField: 'date',
    sort: { date: -1 },
    required: [['number', 'Invoice number'], ['propertyId', 'Property'], ['leaseId', 'Lease'], ['type', 'Invoice type'], ['period', 'Billing month'], ['date', 'Invoice date'], ['base', 'Amount']],
    labels: { type: 'Invoice type', status: 'Invoice status' },
    enums: { type: ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other'], status: ['Submitted', 'Verified', 'Approved', 'Paid', 'Rejected'], source: ['Generated', 'Uploaded'], paidBy: ['Deposit', 'Bank', ''] },
    numbers: ['base', 'gst', 'rcm', 'tds', 'total', 'net', 'paidAmount', 'tdsDeducted'],
    refs: { propertyId: 'properties', leaseId: 'leases', ownerId: 'owners' },
    unique: [['ownerId', 'number']],
  },
  {
    path: 'tickets', model: 'Ticket', singular: 'ticket', plural: 'tickets',
    label: r => r.no,
    search: ['no', 'title', 'category', 'assignee', 'raisedBy'],
    filters: { propertyId: {}, status: {}, priority: {}, responsibility: {}, category: {}, open: { type: 'bool', build: v => ({ status: v ? { $nin: DONE_TKT } : { $in: DONE_TKT } }) } },
    dateField: 'createdAt',
    sort: { createdAt: -1 },
    required: [['no', 'Ticket number'], ['propertyId', 'Property'], ['title', 'Problem'], ['priority', 'Priority']],
    enums: { priority: ['P1', 'P2', 'P3', 'P4'], status: ['Open', 'Assigned', 'In progress', 'Awaiting owner', 'Resolved', 'Closed'], responsibility: ['Owner', 'TrustLab', 'Shared'] },
    numbers: ['cost'],
    refs: { propertyId: 'properties' },
    unique: [['no']],
  },
  {
    path: 'messages', model: 'Message', singular: 'message', plural: 'messages',
    label: r => (r.kind && r.kind !== 'Message' ? r.kind : 'Message'),
    search: ['text', 'by', 'kind'],
    filters: { propertyId: {}, ownerId: {}, from: {}, kind: {} },
    dateField: 'at',
    sort: { at: -1 },
    required: [['propertyId', 'Property'], ['from', 'Sender side'], ['text', 'Message text']],
    labels: { kind: 'Message type' },
    enums: { from: ['tdpl', 'owner'], kind: ['Message', 'Notice', 'Approval request'] },
    refs: { propertyId: 'properties', ownerId: 'owners' },
  },
  {
    path: 'inspections', model: 'Inspection', singular: 'inspection', plural: 'inspections',
    label: r => (r.kind === 'Move-out' ? 'Handover inspection' : 'Take-over inspection'),
    search: ['inspector', 'ownerRep', 'kind', 'status'],
    filters: { propertyId: {}, leaseId: {}, ownerId: {}, kind: {}, status: {} },
    dateField: 'date',
    sort: { date: -1 },
    required: [['kind', 'Inspection type'], ['propertyId', 'Property'], ['leaseId', 'Lease']],
    labels: { kind: 'Inspection type', status: 'Inspection status' },
    enums: { kind: ['Move-in', 'Move-out'], status: ['Not started', 'In progress', 'Awaiting owner sign-off', 'Disputed', 'Signed'] },
    refs: { propertyId: 'properties', leaseId: 'leases', ownerId: 'owners' },
  },
  {
    path: 'sites', model: 'Site', singular: 'site', plural: 'sites',
    label: r => r.name || r.code,
    search: ['name', 'code', 'locality', 'city', 'address', 'ownerName', 'broker', 'scoutedBy'],
    filters: { reqId: {}, stage: {}, purpose: {}, city: {}, propertyId: {}, leaseId: {} },
    dateField: 'scoutedOn',
    sort: { scoutedOn: -1 },
    required: [['code', 'Site code'], ['reqId', 'Scouting requirement']],
    enums: { stage: ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved', 'Agreement', 'Take-over', 'Operational', 'Opened', 'On hold', 'Rejected'] },
    numbers: ['area', 'measuredArea', 'frontage', 'quotedRent', 'quotedDeposit'],
    refs: { reqId: 'reqs', propertyId: 'properties', leaseId: 'leases' },
    unique: [['code']],
  },
  {
    path: 'reqs', model: 'Requirement', singular: 'requirement', plural: 'requirements',
    label: r => r.code,
    search: ['code', 'city', 'area', 'purpose', 'reason', 'raisedBy'],
    filters: { city: {}, state: {}, purpose: {}, priority: {}, status: {}, model: {}, partnerId: {} },
    dateField: 'raisedOn',
    sort: { raisedOn: -1 },
    required: [['code', 'Requirement code'], ['city', 'City'], ['area', 'Area / locality'], ['purpose', 'Purpose'], ['reason', 'Reason']],
    enums: { priority: ['High', 'Normal', 'Low'], status: ['Open', 'Cancelled'], model: ['TrustLab lease', 'Franchise', ''] },
    numbers: ['areaMin', 'areaMax', 'rentMax'],
    refs: { partnerId: 'partners' },
    unique: [['code']],
    dependents: [['sites', 'reqId', 'site']],
  },
  {
    path: 'partners', model: 'Partner', singular: 'franchise partner', plural: 'franchise partners',
    label: r => r.name,
    search: ['name', 'contact', 'city', 'email', 'phone', 'agreementRef'],
    filters: { status: {}, model: {}, city: {}, premisesMgmt: { type: 'bool' } },
    sort: { name: 1 },
    required: [['name', 'Partner name']],
    labels: { model: 'Franchise model' },
    enums: { status: ['Prospect', 'Active', 'Suspended', 'Exited'], model: ['Franchise collection centre', 'Franchise lab', 'Both'] },
    dependents: [['reqs', 'partnerId', 'requirement'], ['properties', 'partnerId', 'property']],
  },
  {
    // TDS deposited (challans) and quarterly TDS returns with Form 16A issued per owner. ws = 'tdpl' for TrustLab,
    // or the franchise partner's id for TDS a partner deducts on premises it manages.
    path: 'tds', model: 'TdsRecord', singular: 'TDS record', plural: 'TDS records',
    label: r => (r.kind === 'return' ? `TDS return Q${r.q} FY ${r.fy}` : `TDS challan ${r.bsr || ''}/${r.challanNo || ''}`),
    search: ['bsr', 'challanNo', 'ack', 'month', 'fy', 'mode', 'filedBy'],
    filters: { kind: {}, ws: {}, month: {}, fy: {}, q: { type: 'number' } },
    sort: { createdAt: -1 },
    required: [['kind', 'Record type']],
    labels: { kind: 'Record type', ws: 'Workspace', fy: 'Financial year', q: 'Quarter', bsr: 'BSR code', challanNo: 'Challan no.', paidOn: 'Paid on', rtype: 'Return type' },
    enums: { kind: ['challan', 'return'], rtype: ['Original', 'Correction', ''] },
    numbers: ['amount', 'interest', 'q'],
    unique: [['ws', 'bsr', 'paidOn', 'challanNo'], ['ws', 'kind', 'fy', 'q']],
    writeRoles: ['admin', 'staff', 'franchisee'], // owners only read their own Form 16A
    view: (r, user) => (user.role === 'owner' ? { ...r, f16a: r.f16a?.[user.ownerId] ? { [user.ownerId]: r.f16a[user.ownerId] } : {} } : r),
  },
  {
    path: 'people', model: 'Person', singular: 'portal user', plural: 'portal users',
    label: r => r.label || r.uid,
    search: ['label', 'uid'],
    filters: { role: {}, ownerId: {}, partnerId: {} },
    sort: { label: 1 },
    required: [['uid', 'Access code'], ['role', 'Role']],
    enums: { role: ['staff', 'owner', 'franchisee'] },
    refs: { ownerId: 'owners', partnerId: 'partners' },
    unique: [['uid']],
  },
]

export const byPath = Object.fromEntries(RESOURCES.map(r => [r.path, r]))

/** Display names for fields in validation messages (used when a field has no `required` label). */
export const FIELD_LABELS = {
  status: 'Status', kind: 'Type', type: 'Type', stage: 'Stage', priority: 'Priority', role: 'Role', source: 'Source', from: 'Sender side',
  gstMode: 'GST on rent', payTiming: 'Rent payment timing', responsibility: 'Responsibility', model: 'Engagement',
  area: 'Area (sq ft)', rent: 'Monthly rent', deposit: 'Security deposit', escPct: 'Escalation %', escAdd: 'Escalation amount (₹)', escEvery: 'Escalate every (months)',
  lockIn: 'Lock-in for lessee (months)', lockInLessor: 'Lock-in for lessor (months)', notice: 'Notice by lessee (months)', noticeLessor: 'Notice by lessor (months)', fitout: 'Rent-free period (days)', maint: 'Maintenance',
  advanceRent: 'Advance rent', advanceMonths: 'Advance adjustment months', brokerage: 'Brokerage', stamp: 'Stamp duty', dueDay: 'Due day', depositUtr: 'Deposit transaction ID', depositChannel: 'Deposit payment channel', depositBank: 'Deposit bank',
  base: 'Amount', gst: 'GST', rcm: 'GST under RCM', tds: 'TDS', total: 'Invoice total', net: 'Net payable', paidAmount: 'Amount paid', tdsDeducted: 'TDS deducted',
  cost: 'Repair cost', measuredArea: 'Measured area', frontage: 'Frontage', quotedRent: 'Quoted rent', quotedDeposit: 'Quoted deposit',
  areaMin: 'Minimum area', areaMax: 'Maximum area', rentMax: 'Rent budget', ownerId: 'Owner', partnerId: 'Franchise partner',
  owners: 'Co-owners', depAdj: 'Deposit adjustments', opening: 'Opening balance', tdsCert: 'TDS certificate', paidBy: 'Paid by',
  amount: 'Amount', interest: 'Interest', month: 'Month', f16a: 'Form 16A',
}
