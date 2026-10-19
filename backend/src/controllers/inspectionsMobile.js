/*
 * Joint inspections for the phone app. Mounted on /api/mobile/inspections. Same records and rules as the web's
 * inspection drawer, but each call changes one thing, so edits made offline can be queued and replayed in order:
 *   GET    /                    what to inspect (leases needing a take-over or handover) and every record in scope
 *   POST   /                    { leaseId, kind }     start a record (or return the open one of that kind)
 *   GET    /:id                 the record with its property, lease, sections, progress, problems and summary
 *   PATCH  /:id                 header fields, area photos, videos, fixtures
 *   PATCH  /:id/items/:k        one checklist item: condition, value, remark, who pays, deduction, photos
 *   POST   /:id/submit          the tenant's side signs and sends the record to the owner
 *   POST   /:id/sign            the owner signs (in their app, or on the inspector's phone on site) — locks the record
 *   POST   /:id/dispute         the owner disagrees
 *   POST   /:id/reopen          back to "In progress" for corrections
 * Photos and videos are uploaded first (POST /api/assets) and referenced here by asset id.
 */
import { models, Asset, toApi } from '../models/index.js'
import { ok, created } from '../utils/respond.js'
import { ApiError, notFound, badRequest } from '../utils/ApiError.js'
import { scopeFilter, matches } from '../auth/scope.js'
import { newId } from '../utils/ids.js'
import { todayIST } from './reportContext.js'
import { notify } from '../services/notify.js'
import { inspectionItems, inspProblems, inspSummary, inspProgress, inspSteps, inspLocked, INSP_SECTIONS, IN_KIND, CONDS, BADC, FIX_SEC, RESP, leaseState, fmtD } from '../../../shared/calc/index.js'

const OPEN = ['Not started', 'In progress', 'Disputed']
const now = () => new Date().toISOString()
const isOwnerUser = u => u.role === 'owner'
const staffLike = u => ['admin', 'staff', 'franchisee'].includes(u.role)
const actorOf = u => u.name || (u.role === 'owner' ? 'Owner' : u.role === 'franchisee' ? 'Franchise partner' : 'Facilities')
const tenantOf = P => (P?.managedBy === 'franchise' ? 'Franchise partner' : 'TrustLab')
const log = (I, u, text) => { I.log = (I.log || []).concat({ at: now(), by: actorOf(u), text }) }

async function load(id, user) {
  const doc = await models.inspections.findById(id).lean()
  if (!doc || !matches(doc, await scopeFilter('inspections', user))) throw notFound(`No inspection found with id “${id}”.`)
  return toApi(doc)
}
async function persist(I) {
  const { id, ...rest } = I; rest.updatedAt = now()
  await models.inspections.updateOne({ _id: id }, { $set: rest })
  return I
}
/** Asset ids (or asset objects already in the shape the web stores) → [{ id, url, name, type, size }]. Unknown ids are dropped. */
async function assetsOf(list) {
  const arr = Array.isArray(list) ? list : []
  const ids = arr.filter(x => typeof x === 'string')
  const docs = ids.length ? await Asset.find({ _id: { $in: ids } }).lean() : []
  const byId = Object.fromEntries(docs.map(d => [d._id, { id: d._id, url: d.url, name: d.name, type: d.type, size: d.size }]))
  return arr.map(x => (typeof x === 'string' ? byId[x] : x && x.id ? { id: x.id, url: x.url || `/api/assets/${x.id}/file`, name: x.name, type: x.type, size: x.size } : null)).filter(Boolean)
}
const started = I => (I.items || []).some(it => it.cond || String(it.val ?? '').trim() || (it.photos || []).length) || (I.roomPhotos || []).length || !!I.tdplVideo
function touch(I, u) { if (I.status === 'Not started' && (I.date || started(I))) { I.status = 'In progress'; log(I, u, `${IN_KIND[I.kind]} started`) } }
const assertOpen = I => { if (inspLocked(I)) throw new ApiError(409, I.status === 'Signed' ? 'This inspection is signed by both parties and locked.' : 'This inspection is with the owner for signature. Reopen it to make corrections.', { code: 'locked' }) }
const assertStaff = u => { if (!staffLike(u)) throw new ApiError(403, 'Owners can review and sign an inspection but not record it.', { code: 'forbidden' }) }

/** The record the phone shows, with everything derived on the server. */
async function view(I, user) {
  const [P, L] = await Promise.all([models.properties.findById(I.propertyId).lean(), models.leases.findById(I.leaseId).lean()])
  const O = I.ownerId ? await models.owners.findById(I.ownerId).lean() : null
  const tenant = tenantOf(P)
  const sections = INSP_SECTIONS.map(s => { const items = (I.items || []).filter(it => it.sec === s); return { s, items, done: inspProgress({ items }).done, total: items.length } }).filter(x => x.total || x.s === FIX_SEC)
  const problems = inspProblems(I, { tenant }).map(([k, m]) => [k, m.replace(/^TrustLab inspector/, 'Facilities inspector')])
  const owner = isOwnerUser(user)
  return {
    inspection: I,
    property: P ? { id: P._id, name: P.name, code: P.code, address: P.address, city: P.city, ownerId: P.ownerId, managedBy: P.managedBy || '' } : null,
    lease: L ? { id: L._id, ref: L.ref, start: L.start, end: L.end, deposit: L.deposit, exit: L.exit ? { stage: L.exit.stage, noticeDate: L.exit.noticeDate, effective: L.exit.effective } : null } : null,
    ownerName: O?.name || I.ownerRep || '',
    title: IN_KIND[I.kind], sections, progress: inspProgress(I), steps: inspSteps(I), problems, summary: inspSummary(I),
    locked: inspLocked(I), canEdit: staffLike(user) && !inspLocked(I), isOwner: owner,
    canSubmit: staffLike(user) && OPEN.includes(I.status) && !problems.length,
    canOwnerVideo: I.status === 'Awaiting owner sign-off',
    canSign: I.status === 'Awaiting owner sign-off' && !!I.ownerVideo,
    canDispute: owner && I.status === 'Awaiting owner sign-off',
    canReopen: staffLike(user) && ['Awaiting owner sign-off', 'Disputed'].includes(I.status),
    resp: RESP, conds: CONDS,
  }
}
const send = async (res, I, user, message) => ok(res, message, await view(I, user))

export async function list(req, res) {
  const user = req.user; const today = todayIST()
  const [records, leases] = await Promise.all([
    models.inspections.find((await scopeFilter('inspections', user)) || {}).sort({ updatedAt: -1, createdAt: -1 }).lean(),
    models.leases.find((await scopeFilter('leases', user)) || {}).lean(),
  ])
  const propIds = [...new Set(records.map(r => r.propertyId).concat(leases.map(l => l.propertyId)))]
  const props = Object.fromEntries((await models.properties.find({ _id: { $in: propIds } }, { name: 1, code: 1, city: 1 }).lean()).map(p => [p._id, p]))
  const rows = records.map(r => { const I = toApi(r); const P = props[I.propertyId] || {}; const sm = inspSummary(I); const pg = inspProgress(I)
    return { id: I.id, kind: I.kind, title: IN_KIND[I.kind], status: I.status, date: I.date || '', propertyId: I.propertyId, propertyName: P.name || '', propertyCode: P.code || '', city: P.city || '', inspector: I.inspector || '', ownerRep: I.ownerRep || '', progress: pg, issues: sm.flagged.length, photos: sm.photos, deductions: sm.ded, updatedAt: I.updatedAt || I.createdAt || '' } })
  const todo = []
  if (staffLike(user)) for (const L of leases) {
    if (L.status === 'Draft') continue
    const st = leaseState(L, today); if (['Terminated'].includes(st)) continue
    const P = props[L.propertyId] || {}
    const has = kind => records.some(r => r.leaseId === L._id && r.kind === kind)
    if (!has('Move-in') && !L.takeoverSkip && st !== 'Expired') todo.push({ leaseId: L._id, kind: 'Move-in', title: 'Take-over inspection', propertyId: L.propertyId, propertyName: P.name || '', propertyCode: P.code || '', when: L.start, note: `Possession ${fmtD(L.start)}` })
    if (L.exit?.noticeDate && !has('Move-out') && !L.handoverSkip) todo.push({ leaseId: L._id, kind: 'Move-out', title: 'Handover inspection', propertyId: L.propertyId, propertyName: P.name || '', propertyCode: P.code || '', when: L.exit.effective, note: `Vacate by ${fmtD(L.exit.effective)}` })
  }
  const counts = { open: rows.filter(r => OPEN.includes(r.status)).length, awaiting: rows.filter(r => r.status === 'Awaiting owner sign-off').length, done: rows.filter(r => r.status === 'Signed').length, todo: todo.length }
  const bits = [counts.open ? `${counts.open} in progress` : '', counts.awaiting ? `${counts.awaiting} waiting for the owner` : '', counts.todo ? `${counts.todo} to start` : ''].filter(Boolean)
  return ok(res, bits.length ? bits.join(', ') + '.' : 'Nothing to inspect right now.', { todo, records: rows, counts })
}

export async function start(req, res) {
  const user = req.user; assertStaff(user)
  const { leaseId, kind } = req.body || {}
  if (!['Move-in', 'Move-out'].includes(kind)) throw badRequest('Choose the inspection type: Move-in (take-over) or Move-out (handover).')
  const L = await models.leases.findById(leaseId).lean()
  if (!L || !matches(L, await scopeFilter('leases', user))) throw notFound(`No lease found with id “${leaseId}”.`)
  if (kind === 'Move-out' && !L.exit?.noticeDate) throw badRequest('A handover inspection starts once notice has been served on this lease.')
  const existing = await models.inspections.findOne({ leaseId: L._id, kind, status: { $ne: 'Signed' } }).lean()
  if (existing) { const I = toApi(existing); return send(res, I, user, `${IN_KIND[kind]} already in progress — continuing it.`) }
  const prev = kind === 'Move-out' ? await models.inspections.findOne({ leaseId: L._id, kind: 'Move-in' }).sort({ createdAt: -1 }).lean() : null
  const O = L.ownerId ? await models.owners.findById(L.ownerId).lean() : null
  const at = now()
  const I = { id: newId(), kind, propertyId: L.propertyId, leaseId: L._id, ownerId: L.ownerId, date: '', inspector: user.name || '', ownerRep: O?.name || '', present: '', items: inspectionItems(prev?.items), roomPhotos: [], status: 'Not started', log: [{ at, by: actorOf(user), text: `${IN_KIND[kind]} record created` }], createdAt: at, updatedAt: at }
  const { id, ...doc } = I
  await models.inspections.create({ _id: id, ...doc })
  return created(res, `${IN_KIND[kind]} started${prev ? ' — the take-over record is shown beside each item' : ''}.`, await view(I, user))
}

export async function one(req, res) { const I = await load(req.params.id, req.user); return send(res, I, req.user, `${IN_KIND[I.kind]} · ${I.status}.`) }

export async function patchItem(req, res) {
  const user = req.user; assertStaff(user)
  const I = await load(req.params.id, user); assertOpen(I)
  const it = (I.items || []).find(x => x.k === req.params.k)
  if (!it) throw notFound(`No checklist item “${req.params.k}” on this inspection.`)
  const b = req.body || {}
  if (b.cond !== undefined) { if (b.cond && !CONDS.includes(b.cond)) throw badRequest(`Condition must be one of ${CONDS.join(', ')}.`); it.cond = b.cond || '' }
  if (b.val !== undefined) it.val = String(b.val ?? '').trim()
  if (b.remark !== undefined) it.remark = String(b.remark ?? '').trim()
  if (b.label !== undefined && it.type === 'fixture') it.label = String(b.label ?? '').trim()
  if (b.qty !== undefined && it.type === 'fixture') it.qty = Math.max(0, +b.qty || 0)
  if (b.resp !== undefined) { if (b.resp && !RESP.some(([v]) => v === b.resp)) throw badRequest('Who bears the cost must be Fair wear & tear, TrustLab or Owner.'); it.resp = b.resp || '' }
  if (b.deduct !== undefined) it.deduct = Math.max(0, +b.deduct || 0)
  if (!BADC(it.cond)) { delete it.resp; delete it.deduct }
  if (b.addPhotos) it.photos = (it.photos || []).concat(await assetsOf(b.addPhotos))
  if (b.removePhoto !== undefined) { const i = +b.removePhoto; if (it.photos && i >= 0 && i < it.photos.length) it.photos.splice(i, 1) }
  touch(I, user); await persist(I)
  return send(res, I, user, `${it.label || 'Item'} saved${it.cond ? ` — ${it.cond}` : ''}.`)
}

export async function patch(req, res) {
  const user = req.user
  const I = await load(req.params.id, user)
  const b = req.body || {}
  const vid = async (v, who) => {
    if (!v || !v.id) throw badRequest('Upload the video first, then save it with its asset id.')
    const [a] = await assetsOf([v.id]); if (!a) throw badRequest('That video was not found. Upload it again.')
    const dur = +v.dur || 0
    if (dur && dur < 5) throw badRequest('Video is too short — record at least 5 seconds.')
    if (dur > 120) throw badRequest('Keep the video under 2 minutes.')
    if ((a.size || 0) > 20e6) throw badRequest('Video is over 20 MB. Record a shorter clip or at 720p.')
    return { ...a, at: now(), by: who === 'tdpl' ? (I.inspector || actorOf(user)) : (I.ownerRep || actorOf(user)), dur, size: a.size || +v.size || 0 }
  }
  if (isOwnerUser(user)) {
    // the owner only adds their confirmation video, once the record is with them
    if (b.ownerVideo === undefined) throw new ApiError(403, 'Owners can review and sign an inspection but not record it.', { code: 'forbidden' })
    if (I.status !== 'Awaiting owner sign-off') throw new ApiError(409, 'Your confirmation video is recorded at sign-off, once the inspection is sent to you.', { code: 'not_yet' })
    I.ownerVideo = await vid(b.ownerVideo, 'owner'); log(I, user, 'Owner confirmation video recorded')
    await persist(I); return send(res, I, user, 'Your confirmation video is saved — you can sign now.')
  }
  assertStaff(user)
  const msgs = []
  if (b.ownerVideo !== undefined) {
    if (I.status !== 'Awaiting owner sign-off' && I.status !== 'Signed') throw new ApiError(409, 'The owner’s video is recorded at sign-off: send the inspection to the owner first.', { code: 'not_yet' })
    if (I.status === 'Signed') assertOpen(I)
    I.ownerVideo = await vid(b.ownerVideo, 'owner'); log(I, user, 'Owner confirmation video recorded'); msgs.push('owner video saved')
  }
  const editing = ['date', 'inspector', 'ownerRep', 'present', 'addRoomPhotos', 'removeRoomPhoto', 'tdplVideo', 'addFixture', 'removeFixture'].some(k => b[k] !== undefined)
  if (editing) {
    assertOpen(I)
    for (const k of ['date', 'inspector', 'ownerRep', 'present']) if (b[k] !== undefined) I[k] = String(b[k] ?? '').trim()
    if (b.date && !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw badRequest('Inspection date should be a date (YYYY-MM-DD).')
    if (b.addRoomPhotos) { const a = await assetsOf(b.addRoomPhotos); I.roomPhotos = (I.roomPhotos || []).concat(a); msgs.push(`${a.length} area photo${a.length === 1 ? '' : 's'} added`) }
    if (b.removeRoomPhoto !== undefined) { const i = +b.removeRoomPhoto; if (I.roomPhotos && i >= 0 && i < I.roomPhotos.length) I.roomPhotos.splice(i, 1) }
    if (b.tdplVideo !== undefined) { I.tdplVideo = await vid(b.tdplVideo, 'tdpl'); log(I, user, 'Facilities confirmation video recorded'); msgs.push('video saved') }
    if (b.addFixture) { const f = b.addFixture; const k = 'fx_' + newId(); I.items = (I.items || []).concat({ k, sec: FIX_SEC, label: String(f.label || '').trim(), type: 'fixture', req: false, qty: Math.max(0, +f.qty || 1), cond: '', remark: '', photos: [] }); msgs.push('fixture added') }
    if (b.removeFixture) { const it = (I.items || []).find(x => x.k === b.removeFixture); if (it && it.type === 'fixture' && !it.prev) I.items = I.items.filter(x => x.k !== b.removeFixture) }
    touch(I, user)
  }
  await persist(I)
  return send(res, I, user, msgs.length ? msgs.join(', ').replace(/^./, c => c.toUpperCase()) + '.' : 'Inspection saved.')
}

export async function submit(req, res) {
  const user = req.user; assertStaff(user)
  const I = await load(req.params.id, user)
  if (!OPEN.includes(I.status)) throw new ApiError(409, `This inspection is ${I.status.toLowerCase()}.`, { code: 'wrong_state' })
  const P = await models.properties.findById(I.propertyId).lean()
  const problems = inspProblems(I, { tenant: tenantOf(P) })
  if (problems.length) throw badRequest(`${problems.length} item${problems.length === 1 ? '' : 's'} to complete before sign-off: ${problems.slice(0, 3).map(p => p[1]).join('; ')}${problems.length > 3 ? '…' : ''}`, problems.map(([k, m]) => ({ field: k, message: m })))
  I.status = 'Awaiting owner sign-off'; I.tdplSign = { name: I.inspector, at: now(), method: 'TruSpace app' }; delete I.dispute
  log(I, user, `Signed for ${tenantOf(P) === 'TrustLab' ? 'the facilities team' : 'the franchise partner'} by ${I.inspector}; sent to owner for sign-off`)
  await persist(I); notify.inspectionSaved({ status: 'In progress' }, I, user)
  if (P) await models.messages.create({ _id: newId(), propertyId: P._id, ownerId: I.ownerId || P.ownerId, from: 'tdpl', by: actorOf(user), kind: 'Approval request', text: `${IN_KIND[I.kind]} of ${P.name} dated ${fmtD(I.date)} is ready for your signature. Open Inspections to review every item and photo, then sign or raise a dispute.`, at: now(), files: [], read: { tdpl: true }, createdAt: now(), updatedAt: now() })
  return send(res, I, user, 'Signed and sent to the owner. They can sign in their app, or on this phone while you are together.')
}

export async function sign(req, res) {
  const user = req.user
  const I = await load(req.params.id, user)
  if (I.status !== 'Awaiting owner sign-off') throw new ApiError(409, I.status === 'Signed' ? 'Already signed by both parties.' : 'Send the inspection to the owner before they sign.', { code: 'wrong_state' })
  const b = req.body || {}
  const name = String(b.name || '').trim(); if (!name) throw badRequest('Type the owner’s full name to sign.')
  if (!I.ownerVideo) throw badRequest('Record the owner’s confirmation video first.')
  if (!b.agree) throw badRequest('Tick the agreement to sign.')
  const method = isOwnerUser(user) ? 'Owner app' : 'On site, inspector’s phone'
  const sig = b.sig && typeof b.sig.d === 'string' && b.sig.d.length < 60000 ? { d: b.sig.d, w: +b.sig.w || 0, h: +b.sig.h || 0 } : null
  I.status = 'Signed'; I.ownerSign = { name, at: now(), method, ...(sig ? { sig } : {}) }; delete I.dispute
  if (b.paper) I.paper = (I.paper || []).concat(await assetsOf(b.paper))
  log(I, user, `Signed by owner (${name}) — ${method}. Record locked.`)
  await persist(I); notify.inspectionSaved({ status: 'Awaiting owner sign-off' }, I, user)
  if (I.kind === 'Move-out') {
    const L = await models.leases.findById(I.leaseId).lean()
    if (L && L.exit) {
      const { flagged } = inspSummary(I); const x = { ...L.exit }
      x.stage = Math.max(x.stage || 1, 2); x.inspectionDate = I.date; x.inspectionId = I.id
      x.inspectionNotes = flagged.length ? flagged.map(it => `${it.label}: ${it.cond}${it.remark ? ' — ' + it.remark : ''} (${it.resp || '—'})`).join('\n') : 'No issues found at handover inspection.'
      x.deductions = (I.items || []).filter(it => it.resp === 'TrustLab' && +it.deduct).map(it => ({ desc: it.label, amount: +it.deduct }))
      const elec = (I.items || []).find(it => it.k === 'm_elec'); if (elec && elec.val) x.meterFinal = elec.val
      await models.leases.updateOne({ _id: L._id }, { $set: { exit: x, updatedAt: now() } })
    }
  }
  return send(res, I, user, 'Inspection signed by both parties and locked.')
}

export async function dispute(req, res) {
  const user = req.user
  const I = await load(req.params.id, user)
  if (!isOwnerUser(user)) throw new ApiError(403, 'Only the owner can dispute an inspection.', { code: 'forbidden' })
  if (I.status !== 'Awaiting owner sign-off') throw new ApiError(409, 'This inspection is not waiting for your signature.', { code: 'wrong_state' })
  const why = String((req.body || {}).reason || '').trim(); if (!why) throw badRequest('Explain what is wrong so the facilities team can correct it.')
  I.status = 'Disputed'; I.dispute = why; delete I.tdplSign; log(I, user, 'Owner disputed: ' + why)
  await persist(I); notify.inspectionSaved({ status: 'Awaiting owner sign-off' }, I, user)
  const P = await models.properties.findById(I.propertyId).lean()
  if (P) await models.messages.create({ _id: newId(), propertyId: P._id, ownerId: I.ownerId || P.ownerId, from: 'owner', by: actorOf(user), kind: 'Message', text: `I do not agree with the ${IN_KIND[I.kind].toLowerCase()} of ${P.name}: ${why}`, at: now(), files: [], read: { owner: true }, createdAt: now(), updatedAt: now() })
  return send(res, I, user, 'Dispute raised. The facilities team will correct the record and send it again.')
}

export async function reopen(req, res) {
  const user = req.user; assertStaff(user)
  const I = await load(req.params.id, user)
  if (!['Awaiting owner sign-off', 'Disputed'].includes(I.status)) throw new ApiError(409, `This inspection is ${I.status.toLowerCase()} and can’t be reopened.`, { code: 'wrong_state' })
  I.status = 'In progress'; delete I.tdplSign; delete I.ownerSign; log(I, user, 'Reopened for correction')
  await persist(I)
  return send(res, I, user, 'Reopened — make the corrections and send it to the owner again.')
}
