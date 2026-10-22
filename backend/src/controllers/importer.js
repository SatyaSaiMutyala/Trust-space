/*
 * Bulk import of owners, properties and leases from one Excel file (admin and staff).
 *
 *   GET  /api/import/template   the workbook to fill in: one sheet per record type, dropdowns with the system's own
 *                               values (owner types, statuses, existing owners and properties…), notes on the headers
 *   POST /api/import/preview    multipart `file` → what the file would do, row by row: create / skip (already in the
 *                               system) / error (with the reason). Nothing is saved.
 *   POST /api/import            multipart `file` → the same plan, then every "create" row is saved, in the order
 *                               owners → properties → leases so a lease can point at an owner from the same file.
 *                               Rows with errors are left out; existing records are never changed.
 *
 * The columns, required flags and dropdown lists live in services/importSpec.js; field rules come from
 * resources/config.js through crud.js (the same checks the forms get).
 */
import ExcelJS from 'exceljs'
import multer from 'multer'
import { models } from '../models/index.js'
import { byPath } from '../resources/config.js'
import { fieldErrors } from './crud.js'
import { SHEETS, SHEET_ORDER, MAX_ROWS, lists, ownerLabel, propertyLabel } from '../services/importSpec.js'
import { ApiError, badRequest } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'
import { count } from '../utils/text.js'
import { newId } from '../utils/ids.js'

const MAX_FILE_MB = 10
export const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (/\.xlsx$/i.test(file.originalname) ? cb(null, true) : cb(new ApiError(415, `“${file.originalname}” is not an Excel file. Download the template, fill it in and upload the .xlsx file.`, { code: 'unsupported_type' }))),
}).single('file')
export function uploadSheetErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) return next(err.code === 'LIMIT_FILE_SIZE' ? new ApiError(413, `The file is larger than ${MAX_FILE_MB} MB.`, { code: 'too_large' }) : badRequest(`The upload could not be read: ${err.message}.`))
  next(err)
}

/* ---------- template ---------- */
const HEAD_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F1EE' } }
const REQ_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4E0' } }
const colLetter = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }

/** The workbook to fill in. `sheets` = which of owners / properties / leases to include (default all three). */
export async function buildTemplate(sheets = SHEET_ORDER) {
  const L = await lists(models)
  const has = k => sheets.includes(k)
  const names = sheets.map(k => SHEETS[k].title)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'TruSpace'; wb.created = new Date()

  // Read me
  const rm = wb.addWorksheet('Read me')
  rm.getColumn(1).width = 110
  const joined = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]
  const refLine = has('leases') && !has('properties') && !has('owners') ? 'The Property and Owner dropdowns list what is already in the system. Add missing properties and owners on their pages (or import them) first.'
    : has('properties') && !has('owners') ? 'The Owner dropdown lists the owners already in the system. Add missing owners on the Owners page (or import them) first.'
    : has('owners') && (has('properties') || has('leases')) ? 'Owner and Property dropdowns list what is already in the system, followed by the owners and properties you add in this same file — fill those sheets from the top, without blank rows in between, and they appear in the dropdowns as you type them.'
    : ''
  const lines = [
    [`TruSpace import — ${joined.toLowerCase()}`, true],
    [''],
    [`1. Fill in the ${joined} sheet${names.length > 1 ? 's' : ''}, one row per record.`],
    ['2. Columns with an orange header are required. Hover over a header for what goes in the column.'],
    ['3. Cells with a dropdown take the values the portal uses. Pick from the list — typed values must match exactly.'],
    ...(refLine ? [[`4. ${refLine}`]] : []),
    ['5. Dates: YYYY-MM-DD (e.g. 2026-04-01) or a real Excel date. Amounts: numbers only, no ₹ or commas needed.'],
    ['6. Blank cells take the defaults shown in the header notes (e.g. Status = Active, TDS = Yes). GST on rent defaults to Forward when the owner has a GSTIN, otherwise RCM.'],
    ['7. Upload the file with “Import from Excel” on the portal. You get a row-by-row preview first; nothing is saved until you confirm.'],
    ['8. Owners already in the system (same PAN, or same name without PAN), properties with an existing site code and leases with an existing reference are skipped, never changed.'],
    [''],
    [`Owners: ${count(L.owners.length, 'owner', 'owners')} in the system · Properties: ${count(L.properties.length, 'property', 'properties')} in the system`],
  ].map((l, i, arr) => (i >= 3 && i < arr.length - 2 && /^\d\. /.test(l[0]) ? [l[0].replace(/^\d/, String(arr.slice(2, i).filter(x => /^\d\. /.test(x[0])).length + 1)), l[1]] : l)) // renumber when a line is left out
  lines.forEach(([text, bold]) => { const r = rm.addRow([text]); r.getCell(1).alignment = { wrapText: true, vertical: 'top' }; if (bold) r.font = { bold: true, size: 14 } })

  // Lists (dropdown sources)
  const ls = wb.addWorksheet('Lists'); ls.state = 'hidden'
  const ranges = {}
  Object.entries(L).forEach(([name, values], i) => {
    const col = i + 1
    ls.getCell(1, col).value = name
    values.forEach((v, j) => { ls.getCell(j + 2, col).value = v })
    ranges[name] = values.length ? `Lists!$${colLetter(col)}$2:$${colLetter(col)}$${values.length + 1}` : null
  })
  // Owners and properties: what is in the system now, followed by the rows typed into this file's Owners / Properties
  // sheets (formulas), so a lease can pick an owner added two tabs earlier. The dropdown's height follows how many rows
  // are filled in (OFFSET + COUNTA), which keeps blank entries out of the list.
  const colOf = (sheet, key) => colLetter(SHEETS[sheet].cols.findIndex(c => c.key === key) + 1)
  const live = [
    ['owners', 'Owners', L.owners, r => `IF(Owners!${colOf('owners', 'name')}${r}="","",Owners!${colOf('owners', 'name')}${r}&IF(Owners!${colOf('owners', 'pan')}${r}="",""," · "&Owners!${colOf('owners', 'pan')}${r}))`],
    ['properties', 'Properties', L.properties, r => `IF(Properties!${colOf('properties', 'code')}${r}="","",Properties!${colOf('properties', 'code')}${r}&" · "&Properties!${colOf('properties', 'name')}${r})`],
  ].filter(([name]) => has(name)) // only when that sheet is in this file; otherwise the dropdown is the static list of what exists
  live.forEach(([name, sheet, existing, formulaFor], i) => {
    const col = Object.keys(L).length + i + 1, letter = colLetter(col)
    ls.getCell(1, col).value = name + 'Live'
    existing.forEach((v, j) => { ls.getCell(j + 2, col).value = v })
    for (let r = 2; r <= MAX_ROWS + 1; r++) ls.getCell(existing.length + r, col).value = { formula: formulaFor(r), result: '' }
    ranges[name] = `OFFSET(Lists!$${letter}$2,0,0,MAX(1,${existing.length}+COUNTA(${sheet}!$A$2:$A$${MAX_ROWS + 1})),1)`
  })
  wb.calcProperties.fullCalcOnLoad = true // the formulas above have no cached values; Excel works them out on open

  for (const key of sheets) {
    const spec = SHEETS[key]
    const ws = wb.addWorksheet(spec.title)
    ws.columns = spec.cols.map(c => ({ header: c.label, key: c.key, width: c.width || 16 }))
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    const head = ws.getRow(1); head.font = { bold: true }; head.height = 20
    spec.cols.forEach((c, i) => {
      const cell = head.getCell(i + 1)
      cell.fill = c.required ? REQ_FILL : HEAD_FILL
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFB8C9C2' } } }
      const notes = [c.required ? 'Required.' : '', c.note || '', c.def !== undefined && c.def !== '' ? `Blank = ${c.def}.` : '', c.list && !c.loose ? 'Pick from the dropdown.' : ''].filter(Boolean)
      if (notes.length) cell.note = { texts: [{ text: notes.join(' ') }] }
      const letter = colLetter(i + 1), range = `${letter}2:${letter}${MAX_ROWS + 1}`
      if (c.kind === 'date') ws.getColumn(i + 1).numFmt = 'yyyy-mm-dd'
      if (c.kind === 'number') ws.getColumn(i + 1).numFmt = '0.##'
      if (c.list && ranges[c.list]) {
        ws.dataValidations.add(range, c.loose
          ? { type: 'list', allowBlank: true, formulae: [ranges[c.list]], showErrorMessage: false } // dropdown, but a PAN / site code from this file is fine too
          : { type: 'list', allowBlank: true, formulae: [ranges[c.list]], showErrorMessage: true, errorStyle: 'stop', errorTitle: 'Not a valid value', error: `Pick one of the values in the dropdown for “${c.label}”.` })
      }
    })
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

/* ---------- reading a filled-in file ---------- */
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
const pad = n => String(n).padStart(2, '0')
const isoUTC = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A cell's plain value: text, number or Date (rich text, formulas and hyperlinks unwrapped). */
function plain(v) {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map(r => r.text).join('')
    if (v.result !== undefined) return plain(v.result)
    if (v.text !== undefined) return plain(v.text)
    if (v.error) return ''
    return String(v)
  }
  return v
}

function toDate(v) {
  if (v === '' || v === null || v === undefined) return ''
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : isoUTC(v)
  if (typeof v === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return isoUTC(d) } // Excel serial
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}` // DD/MM/YYYY
  const d = new Date(s); return Number.isNaN(d.getTime()) ? null : isoUTC(d)
}
function toNumber(v) {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'number') return v
  const s = String(v).replace(/[₹,\s]/g, '')
  return s === '' ? '' : Number.isNaN(Number(s)) ? null : Number(s)
}
function toBool(v) {
  if (v === '' || v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v
  const s = norm(v)
  if (['yes', 'y', 'true', '1'].includes(s)) return true
  if (['no', 'n', 'false', '0'].includes(s)) return false
  return null
}
const text = v => (v instanceof Date ? isoUTC(v) : String(v ?? '').trim())

/** Sheet → [{ row, cells: { key: raw } }], matching headers to the spec by label (case-insensitive). */
function readSheet(wb, key) {
  const spec = SHEETS[key]
  const ws = wb.worksheets.find(w => norm(w.name) === norm(spec.title))
  if (!ws) return { rows: [], missing: true }
  const headers = {}
  ws.getRow(1).eachCell((cell, col) => { const h = norm(plain(cell.value)).replace(/\s*\*$/, ''); const c = spec.cols.find(x => norm(x.label) === h); if (c) headers[c.key] = col })
  if (!Object.keys(headers).length) return { rows: [], missing: true }
  const rows = []
  ws.eachRow((row, n) => {
    if (n === 1 || n > MAX_ROWS + 1) return
    const cells = {}; let any = false
    for (const c of spec.cols) { const v = headers[c.key] ? plain(row.getCell(headers[c.key]).value) : ''; cells[c.key] = v; if (v !== '' && v !== null) any = true }
    if (any) rows.push({ row: n, cells })
  })
  return { rows, missing: false }
}

/** Raw cells → typed values + { field: message } for the spec's own rules (required, kind, list). */
function readCells(key, cells, L) {
  const out = {}, errors = {}
  for (const c of SHEETS[key].cols) {
    let v = cells[c.key]
    if (v === '' || v === null || v === undefined) {
      if (c.required) errors[c.key] = `${c.label} is required`
      out[c.key] = c.def !== undefined ? (c.kind === 'bool' ? toBool(c.def) : c.def) : ''
      continue
    }
    if (c.kind === 'date') { v = toDate(v); if (v === null) errors[c.key] = `${c.label} must be a date (YYYY-MM-DD)` }
    else if (c.kind === 'number') { v = toNumber(v); if (v === null) errors[c.key] = `${c.label} must be a number` }
    else if (c.kind === 'bool') { v = toBool(v); if (v === null) errors[c.key] = `${c.label} must be Yes or No` }
    else {
      v = text(v); if (c.upper) v = v.toUpperCase()
      if (c.list && !c.loose) { const hit = L[c.list].find(x => norm(x) === norm(v)); if (hit) v = hit; else errors[c.key] = `${c.label} must be one of: ${L[c.list].join(', ')}` }
    }
    out[c.key] = v
  }
  return { values: out, errors }
}

/* ---------- planning ---------- */
/** Resolve an owner cell: "Name · PAN", a PAN, or a name — against the database, then the Owners sheet. */
function findOwner(ref, dbOwners, sheetOwners) {
  const raw = String(ref || '').trim(); if (!raw) return null
  const parts = raw.split('·').map(s => s.trim())
  const pan = parts.map(p => p.toUpperCase()).find(p => PAN.test(p))
  const name = norm(parts[0])
  const byPan = pan ? dbOwners.find(o => (o.pan || '').toUpperCase() === pan) : null
  if (byPan) return { id: byPan._id, name: byPan.name }
  const sheetByPan = pan ? sheetOwners.find(r => r.values.pan === pan) : null
  if (sheetByPan) return { sheet: sheetByPan }
  if (pan && !parts[0]) return null
  const byName = dbOwners.filter(o => norm(o.name) === name)
  if (byName.length === 1) return { id: byName[0]._id, name: byName[0].name }
  if (byName.length > 1) return { ambiguous: byName.length }
  const sheetByName = sheetOwners.filter(r => norm(r.values.name) === name)
  if (sheetByName.length === 1) return { sheet: sheetByName[0] }
  if (sheetByName.length > 1) return { ambiguous: sheetByName.length }
  return null
}
/** Resolve a property cell: "CODE · Name", a site code, or a name. */
function findProperty(ref, dbProps, sheetProps) {
  const raw = String(ref || '').trim(); if (!raw) return null
  const parts = raw.split('·').map(s => s.trim())
  const code = parts[0].toUpperCase()
  const byCode = dbProps.find(p => (p.code || '').toUpperCase() === code)
  if (byCode) return { id: byCode._id, name: byCode.name }
  const sheetByCode = sheetProps.find(r => r.values.code === code)
  if (sheetByCode) return { sheet: sheetByCode }
  const name = norm(parts[0])
  const byName = dbProps.filter(p => norm(p.name) === name)
  if (byName.length === 1) return { id: byName[0]._id, name: byName[0].name }
  const sheetByName = sheetProps.filter(r => norm(r.values.name) === name)
  if (sheetByName.length === 1) return { sheet: sheetByName[0] }
  return byName.length + sheetByName.length > 1 ? { ambiguous: byName.length + sheetByName.length } : null
}
const refNote = (what, ref, hit, sheetKey) => {
  if (!hit) return `${what} “${ref}” is not in the system or in the ${sheetKey} sheet`
  if (hit.ambiguous) return `${what} “${ref}” matches ${hit.ambiguous} records — use the PAN or site code`
  if (hit.sheet && hit.sheet.action === 'error') return `${what} on row ${hit.sheet.row} of the ${sheetKey} sheet has errors`
  return ''
}

/** Everything the file would do. Each sheet: { rows: [{ row, label, action, note, errors, rec, ... }], create, skip, error, missing }. */
export async function planImport(buffer) {
  const wb = new ExcelJS.Workbook()
  try { await wb.xlsx.load(buffer) } catch (e) { throw badRequest('The file could not be read as an Excel workbook. Download the template, fill it in and upload the .xlsx file.') }
  const L = await lists(models)
  const [dbOwners, dbProps, dbLeases] = await Promise.all([
    models.owners.find({}, { name: 1, pan: 1, gstin: 1 }).lean(),
    models.properties.find({}, { code: 1, name: 1 }).lean(),
    models.leases.find({}, { ref: 1 }).lean(),
  ])
  const plan = {}
  const finish = (key, rows) => { plan[key] = { rows, create: rows.filter(r => r.action === 'create').length, skip: rows.filter(r => r.action === 'skip').length, error: rows.filter(r => r.action === 'error').length } }

  // owners
  const so = readSheet(wb, 'owners')
  const owners = so.rows.map(({ row, cells }) => {
    const { values: v, errors } = readCells('owners', cells, L)
    if (v.pan && !PAN.test(v.pan)) errors.pan = 'PAN must look like ABCDE1234F'
    if (v.gstin && !GSTIN.test(v.gstin)) errors.gstin = 'GSTIN must be 15 characters, e.g. 36ABCPK1234F1Z5'
    if (v.email && !EMAIL.test(v.email)) errors.email = 'Email does not look right'
    if (v.invPrefix && v.invPrefix.length > 5) errors.invPrefix = 'Invoice prefix is up to 5 letters'
    const rec = {
      name: v.name, kind: v.kind, party: v.party || 'Owner', pan: v.pan, gstin: v.party === 'Co-share' ? '' : v.gstin, phone: v.phone, whatsapp: v.phone, email: v.email, prefContact: 'WhatsApp', lang: 'English',
      addr: { line: v.addrLine, city: v.addrCity, state: v.addrState, pin: v.addrPin }, address: [v.addrLine, v.addrCity, v.addrState, v.addrPin].filter(Boolean).join(', '), noticeSame: true,
      acctHolder: v.acctHolder || v.name, bankName: v.bankName, bankBranch: v.bankBranch, acctNo: v.acctNo, ifsc: v.ifsc, acctType: v.acctType, invPrefix: v.invPrefix,
      bankVerified: false, panStatus: v.pan ? 'Not verified' : '',
    }
    Object.assign(errors, fieldErrors(byPath.owners, rec))
    return { row, label: ownerLabel(v), values: v, rec, errors, action: Object.keys(errors).length ? 'error' : 'create', note: Object.values(errors).join('; ') }
  })
  for (const r of owners) {
    if (r.action === 'error') continue
    const dup = owners.find(x => x !== r && x.row < r.row && x.action !== 'error' && (r.values.pan ? x.values.pan === r.values.pan : norm(x.values.name) === norm(r.values.name)))
    if (dup) { r.action = 'error'; r.note = `Same ${r.values.pan ? 'PAN' : 'name'} as row ${dup.row}`; continue }
    const ex = r.values.pan ? dbOwners.find(o => (o.pan || '').toUpperCase() === r.values.pan) : dbOwners.find(o => norm(o.name) === norm(r.values.name))
    if (ex) { r.action = 'skip'; r.existingId = ex._id; r.note = `Already in the system as ${ownerLabel(ex)}` }
  }
  finish('owners', owners)

  // properties
  const sp = readSheet(wb, 'properties')
  const props = sp.rows.map(({ row, cells }) => {
    const { values: v, errors } = readCells('properties', cells, L)
    const rec = { code: v.code, name: v.name, type: v.type, branch: v.branch, status: v.status, address: v.address, city: v.city, state: v.state, area: v.area === '' ? '' : v.area, floors: v.floors, meter: v.meter, ownerId: '', owners: [], photos: [], docs: [] }
    Object.assign(errors, fieldErrors(byPath.properties, rec))
    const r = { row, label: v.code ? propertyLabel(v) : v.name, values: v, rec, errors, action: Object.keys(errors).length ? 'error' : 'create', note: Object.values(errors).join('; ') }
    if (v.owner && r.action !== 'error') {
      const hit = findOwner(v.owner, dbOwners, owners)
      const bad = refNote('Owner', v.owner, hit, 'Owners')
      if (bad) { r.action = 'error'; r.errors.owner = bad; r.note = bad } else r.owner = hit
    }
    return r
  })
  for (const r of props) {
    if (r.action === 'error') continue
    const dup = props.find(x => x !== r && x.row < r.row && x.action !== 'error' && x.values.code === r.values.code)
    if (dup) { r.action = 'error'; r.note = `Same site code as row ${dup.row}`; continue }
    const ex = dbProps.find(p => (p.code || '').toUpperCase() === r.values.code)
    if (ex) { r.action = 'skip'; r.existingId = ex._id; r.note = `Already in the system as ${propertyLabel(ex)}` }
  }
  finish('properties', props)

  // leases
  const sl = readSheet(wb, 'leases')
  const leases = sl.rows.map(({ row, cells }) => {
    const { values: v, errors } = readCells('leases', cells, L)
    const r = { row, label: v.ref, values: v, errors, action: 'create', note: '' }
    const P = v.property ? findProperty(v.property, dbProps, props) : null
    const O = v.owner ? findOwner(v.owner, dbOwners, owners) : null
    if (v.property) { const bad = refNote('Property', v.property, P, 'Properties'); if (bad) errors.property = bad; else r.property = P }
    if (v.owner) { const bad = refNote('Owner', v.owner, O, 'Owners'); if (bad) errors.owner = bad; else r.owner = O }
    if (v.start && v.end && v.end <= v.start) errors.end = 'Lease end must be after the lease start'
    if (v.rent !== '' && v.rent <= 0) errors.rent = 'Monthly rent must be more than 0'
    if (v.dueDay !== '' && (v.dueDay < 1 || v.dueDay > 28)) errors.dueDay = 'Due day must be between 1 and 28'
    // co-shares: "PAN:percent, PAN:percent" → extra split rows (role coShare, no GST, no deposit or advance); the owner keeps the rest
    const cs = []
    if (v.coShares) {
      for (const part of String(v.coShares).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)) {
        const m = part.match(/^(.+?)\s*[:=]\s*([\d.]+)\s*%?$/)
        if (!m) { errors.coShares = `Co-shares must be written as PAN:percent, e.g. ABCPK1234F:20 — “${part}” is not`; break }
        const hit = findOwner(m[1], dbOwners, owners); const bad = refNote('Co-share', m[1], hit, 'Owners')
        if (bad) { errors.coShares = bad; break }
        const pct = Number(m[2]); if (!(pct > 0 && pct <= 100)) { errors.coShares = `Co-share percent for “${m[1]}” must be between 0 and 100`; break }
        if (O && ((hit.id && hit.id === O.id) || (hit.sheet && O.sheet && hit.sheet === O.sheet))) { errors.coShares = 'The owner cannot also be a co-share of their own rent'; break }
        cs.push({ ref: m[1], hit, pct })
      }
      const total = cs.reduce((a, c) => a + c.pct, 0)
      if (!errors.coShares && total >= 100) errors.coShares = `Co-share percents add up to ${total}% — the owner must keep some of the rent`
    }
    r.coShares = cs
    // GST default follows the owner's registration
    let gstMode = v.gstMode
    if (!gstMode) { const gstin = O?.id ? dbOwners.find(o => o._id === O.id)?.gstin : O?.sheet ? O.sheet.values.gstin : ''; gstMode = gstin ? 'Forward' : 'RCM' }
    r.rec = {
      ref: v.ref, propertyId: P?.id || '', ownerId: O?.id || '', status: v.status, start: v.start, end: v.end, rent: v.rent, payTiming: v.payTiming, dueDay: v.dueDay,
      deposit: v.deposit, depositPaid: !!v.depositPaid, depositUtr: v.depositUtr, depositChannel: v.depositChannel, depositBank: v.depositBank, lockIn: v.lockIn, lockInLessor: cells.lockInLessor === '' || cells.lockInLessor === undefined ? v.lockIn : v.lockInLessor, notice: v.notice, noticeLessor: v.noticeLessor, fitout: v.fitout,
      escPct: v.escAdd > 0 ? 0 : v.escPct, escAdd: v.escAdd, escEvery: v.escEvery, escType: v.escAdd > 0 ? 'Amount' : v.escType, escFrom: v.escFrom, stepKind: v.stepKind === '% of base' ? 'pct' : v.stepKind === 'New rent' ? 'new' : 'amt', stepValue: v.stepValue === '' ? 0 : v.stepValue, stepAt: v.stepAt, stepOn: v.stepOn === 'Revised base (simple)' ? 'simple' : 'compound', gstMode, tds: !!v.tds, tdsOnMaint: false,
      maintType: v.maintType, maint: v.maint, maintEsc: false, elec: v.elec, registered: !!v.registered, advanceRent: 0, advanceMonths: 0, brokerage: 0, stamp: 0, clauses: '', docs: [],
      owners: cs.length ? [{ ownerId: O?.id || '', rent: 100 - cs.reduce((a, c) => a + c.pct, 0), maint: 100 - cs.reduce((a, c) => a + c.pct, 0), dep: 100, adv: 100, gst: '' }, ...cs.map(c => ({ ownerId: c.hit.id || '', rent: c.pct, maint: c.pct, dep: 0, adv: 0, gst: 'None', role: 'coShare' }))] : [],
    }
    const fe = fieldErrors(byPath.leases, { ...r.rec, propertyId: P ? 'x' : '', ownerId: O ? 'x' : '' }) // refs are checked above with better messages
    for (const [k, m] of Object.entries(fe)) if (!errors[k]) errors[k] = m
    if (Object.keys(errors).length) { r.action = 'error'; r.note = Object.values(errors).join('; ') }
    return r
  })
  for (const r of leases) {
    if (r.action === 'error') continue
    const dup = leases.find(x => x !== r && x.row < r.row && x.action !== 'error' && norm(x.values.ref) === norm(r.values.ref))
    if (dup) { r.action = 'error'; r.note = `Same lease reference as row ${dup.row}`; continue }
    const ex = dbLeases.find(l => norm(l.ref) === norm(r.values.ref))
    if (ex) { r.action = 'skip'; r.existingId = ex._id; r.note = `Already in the system (${ex.ref})` }
  }
  finish('leases', leases)

  for (const k of SHEET_ORDER) plan[k].missing = ({ owners: so, properties: sp, leases: sl })[k].missing
  const tot = k => SHEET_ORDER.reduce((a, s) => a + plan[s][k], 0)
  plan.total = { create: tot('create'), skip: tot('skip'), error: tot('error'), rows: tot('create') + tot('skip') + tot('error') }
  return plan
}

/** The plan as sent to the client (no records, no Mongoose docs). */
const toClient = plan => ({
  ...Object.fromEntries(SHEET_ORDER.map(k => [k, { ...plan[k], rows: plan[k].rows.map(r => ({ row: r.row, label: r.label, action: r.action, note: r.note, errors: r.errors })) }])),
  total: plan.total,
})
const summary = p => SHEET_ORDER.filter(k => p[k].rows.length).map(k => `${count(p[k].create, SHEETS[k].singular, SHEETS[k].plural)} new${p[k].skip ? `, ${p[k].skip} already there` : ''}${p[k].error ? `, ${count(p[k].error, 'row', 'rows')} with errors` : ''}`).join(' · ')

export const importController = {
  /** ?sheet=owners|properties|leases → just that sheet (the page's own template); without it, all three. */
  async template(req, res) {
    const sheet = String(req.query.sheet || '')
    if (sheet && !SHEET_ORDER.includes(sheet)) throw badRequest(`There is no “${sheet}” template. Choose owners, properties or leases.`)
    const buf = await buildTemplate(sheet ? [sheet] : SHEET_ORDER)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="truspace-${sheet || 'import'}-template.xlsx"`)
    res.send(buf)
  },

  async preview(req, res) {
    if (!req.file) throw badRequest('Choose the filled-in Excel file to upload.')
    const plan = await planImport(req.file.buffer)
    if (!plan.total.rows) throw badRequest(SHEET_ORDER.every(k => plan[k].missing) ? 'The file has none of the Owners, Properties or Leases sheets. Download the template and fill it in.' : 'The file has no rows to import.')
    const msg = plan.total.create ? `Ready to add ${summary(plan)}.` : plan.total.error ? `Nothing can be added yet: ${summary(plan)}.` : 'Everything in the file is already in the system.'
    return ok(res, msg, toClient(plan))
  },

  async commit(req, res) {
    if (!req.file) throw badRequest('Choose the filled-in Excel file to upload.')
    const plan = await planImport(req.file.buffer)
    if (!plan.total.create) throw badRequest(plan.total.error ? `Nothing can be added: ${summary(plan)}.` : 'Everything in the file is already in the system — nothing to add.')
    const now = new Date().toISOString()
    const stamp = rec => ({ ...rec, createdAt: now, updatedAt: now })
    const idOf = hit => (hit?.id ? hit.id : hit?.sheet ? (hit.sheet.newId || hit.sheet.existingId || '') : '')
    const done = { owners: 0, properties: 0, leases: 0 }
    for (const r of plan.owners.rows) if (r.action === 'create') { r.newId = newId(); await models.owners.create({ _id: r.newId, ...stamp(r.rec) }); done.owners++ }
    for (const r of plan.properties.rows) if (r.action === 'create') {
      r.newId = newId(); const ownerId = idOf(r.owner)
      await models.properties.create({ _id: r.newId, ...stamp({ ...r.rec, ownerId }) }); done.properties++
    }
    for (const r of plan.leases.rows) if (r.action === 'create') {
      const propertyId = idOf(r.property), ownerId = idOf(r.owner)
      if (!propertyId || !ownerId) { r.action = 'error'; r.note = 'Its property or owner could not be added'; plan.leases.create--; plan.leases.error++; continue }
      const csIds = (r.coShares || []).map(c => idOf(c.hit))
      if (csIds.some(id => !id)) { r.action = 'error'; r.note = 'A co-share could not be added'; plan.leases.create--; plan.leases.error++; continue }
      const owners = r.rec.owners.length ? r.rec.owners.map((o, i) => (i === 0 ? { ...o, ownerId } : { ...o, ownerId: csIds[i - 1] })) : []
      r.newId = newId(); await models.leases.create({ _id: r.newId, ...stamp({ ...r.rec, propertyId, ownerId, owners }) }); done.leases++
    }
    const parts = SHEET_ORDER.filter(k => done[k]).map(k => count(done[k], SHEETS[k].singular, SHEETS[k].plural))
    return created(res, `Added ${parts.join(', ')}.${plan.total.skip ? ` ${count(plan.total.skip, 'row was', 'rows were')} already in the system.` : ''}${plan.total.error ? ` ${count(plan.total.error, 'row', 'rows')} with errors left out.` : ''}`, { added: done, ...toClient(plan) })
  },
}
