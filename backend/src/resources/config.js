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
 *   dependents   [resource path, field, word] — blocks delete while dependent records exist
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
    dependents: [['leases', 'propertyId', 'lease'], ['tickets', 'propertyId', 'ticket'], ['invoices', 'propertyId', 'invoice']],
  },
  {
    path: 'owners', model: 'Owner', singular: 'owner', plural: 'owners',
    label: r => r.name,
    search: ['name', 'phone', 'email', 'pan', 'gstin', 'addr.city', 'bankName'],
    filters: { kind: {}, partnerId: {}, bankVerified: { type: 'bool' }, bankPending: { type: 'bool' }, prefContact: {} },
    sort: { name: 1 },
    required: [['name', 'Owner name']],
    labels: { kind: 'Owner type' },
    enums: { kind: ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust'] },
    refs: { partnerId: 'partners' },
    dependents: [['properties', 'ownerId', 'property'], ['leases', 'ownerId', 'lease']],
  },
  {
    path: 'leases', model: 'Lease', singular: 'lease', plural: 'leases',
    label: r => r.ref,
    search: ['ref', 'clauses'],
    filters: { propertyId: {}, ownerId: {}, status: {}, gstMode: {}, payTiming: {}, registered: { type: 'bool' } },
    dateField: 'start',
    sort: { start: -1 },
    required: [['ref', 'Lease reference'], ['propertyId', 'Property'], ['start', 'Lease start date'], ['end', 'Lease end date'], ['rent', 'Monthly rent']],
    labels: { status: 'Agreement status' },
    enums: { status: ['Draft', 'Active'], gstMode: ['Forward', 'RCM', 'None'], payTiming: ['Advance', 'Arrears'] },
    numbers: ['rent', 'deposit', 'escPct', 'escEvery', 'lockIn', 'notice', 'fitout', 'maint', 'advanceRent', 'advanceMonths', 'brokerage', 'stamp', 'dueDay'],
    refs: { propertyId: 'properties', ownerId: 'owners' },
    unique: [['ref']],
    dependents: [['invoices', 'leaseId', 'invoice'], ['inspections', 'leaseId', 'inspection']],
  },
  {
    path: 'invoices', model: 'Invoice', singular: 'invoice', plural: 'invoices',
    label: r => r.number,
    search: ['number', 'desc', 'type', 'utr', 'period'],
    filters: {
      propertyId: {}, leaseId: {}, ownerId: {}, type: {}, status: {}, period: {}, source: {},
      open: { type: 'bool', build: v => ({ status: v ? { $nin: DONE_INV } : { $in: DONE_INV } }) }, // not yet paid / rejected
      overdue: { type: 'bool', build: v => v ? { status: { $nin: DONE_INV }, dueDate: { $lt: today() } } : { $or: [{ status: { $in: DONE_INV } }, { dueDate: { $gte: today() } }] } },
    },
    dateField: 'date',
    sort: { date: -1 },
    required: [['number', 'Invoice number'], ['propertyId', 'Property'], ['leaseId', 'Lease'], ['type', 'Invoice type'], ['period', 'Billing month'], ['date', 'Invoice date'], ['base', 'Amount']],
    labels: { type: 'Invoice type', status: 'Invoice status' },
    enums: { type: ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other'], status: ['Submitted', 'Verified', 'Approved', 'Paid', 'Rejected'], source: ['Generated', 'Uploaded'] },
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
    enums: { kind: ['Move-in', 'Move-out'], status: ['In progress', 'Awaiting owner sign-off', 'Disputed', 'Signed'] },
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
  area: 'Area (sq ft)', rent: 'Monthly rent', deposit: 'Security deposit', escPct: 'Escalation %', escEvery: 'Escalate every (months)',
  lockIn: 'Lock-in (months)', notice: 'Notice period (months)', fitout: 'Rent-free period (days)', maint: 'Maintenance',
  advanceRent: 'Advance rent', advanceMonths: 'Advance adjustment months', brokerage: 'Brokerage', stamp: 'Stamp duty', dueDay: 'Due day',
  base: 'Amount', gst: 'GST', rcm: 'GST under RCM', tds: 'TDS', total: 'Invoice total', net: 'Net payable', paidAmount: 'Amount paid', tdsDeducted: 'TDS deducted',
  cost: 'Repair cost', measuredArea: 'Measured area', frontage: 'Frontage', quotedRent: 'Quoted rent', quotedDeposit: 'Quoted deposit',
  areaMin: 'Minimum area', areaMax: 'Maximum area', rentMax: 'Rent budget', ownerId: 'Owner', partnerId: 'Franchise partner',
}
