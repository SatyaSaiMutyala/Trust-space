/*
 * What gets a push notification, to whom, and where a tap takes them. Called after records are saved (crud.js) and
 * from the mobile controllers. Never throws: a failed push must not fail the request that caused it.
 *   messages      new message → the other side of the thread                     truspace://thread/:propertyId
 *   invoices      owner submits → tenant side; verified/approved/paid/rejected → owner
 *   tickets       raised → the other side; update with a new log entry / status → the other side
 *   inspections   sent for sign-off → owner; disputed → tenant side; signed → tenant side
 *   leases        new deposit adjustment proposed → that owner; agreed/declined → tenant side
 *   sign-ups      new pending account → admins and staff; approved → the owner
 */
import { pushToUsers, ownerUsers, tenantUsers, propertyOwnerIds } from './push.js'
import { emitUsers, emitThread } from './realtime.js'
import { models } from '../models/index.js'
import { User } from '../models/auth.js'
import { perLabel, inr, fmtD } from '../../../shared/calc/index.js'

const propName = async id => (id ? (await models.properties.findById(id, { name: 1 }).lean())?.name || '' : '')
const ownerName = async id => (id ? (await models.owners.findById(id, { name: 1 }).lean())?.name || '' : '')
const short = (s, n = 90) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t }
const safe = fn => async (...a) => { try { return await fn(...a) } catch (e) { console.error('Notification failed:', e.message); return null } }
/** The actor's own account never gets its own notification. */
const except = (ids, user) => ids.filter(id => id !== user?._id)

/** Push + live event to the given accounts. */
const deliver = (ids, note) => { emitUsers(ids, 'notify', { title: note.title, body: note.body, link: note.link, web: note.web, tag: note.tag }); return pushToUsers(ids, note) }
/** Push to the tenant side (staff / admins / franchise partner) of a property. */
const toTenant = async (propertyId, note, user) => deliver(except(await tenantUsers(propertyId), user), note)
/** Push to the accounts of the given owner(s). */
const toOwners = async (ownerIds, note, user) => deliver(except(await ownerUsers(ownerIds), user), note)

export const notify = {
  messageSent: safe(async (m, user) => {
    emitThread(m.propertyId, 'message:new', m) // everyone with the conversation open sees it at once
    const P = await propName(m.propertyId); const who = m.by || (m.from === 'owner' ? 'Owner' : 'Facilities')
    const note = { title: m.kind && m.kind !== 'Message' ? `${m.kind} · ${P}` : `${who} · ${P}`, body: short(m.text, 120), link: `truspace://thread/${m.propertyId}`, web: `/?thread=${m.propertyId}`, tag: `thread:${m.propertyId}` }
    if (m.from === 'owner') return toTenant(m.propertyId, note, user)
    return toOwners(m.ownerId ? [m.ownerId] : await propertyOwnerIds(m.propertyId), note, user)
  }),

  invoiceChanged: safe(async (prev, inv, user) => {
    const P = await propName(inv.propertyId); const what = `${inv.voucher ? 'Rent payment' : inv.type} ${perLabel(inv.period)} · ${inr(inv.net)}`; const W = inv.voucher ? 'Rent payment' : 'Invoice'
    if (!prev) { // new invoice
      if (inv.source === 'Generated' && inv.generated) return null // the monthly batch: no push per invoice
      if (user?.role === 'owner') return toTenant(inv.propertyId, { title: 'Owner sent an invoice', body: `${await ownerName(inv.ownerId)} · ${what} · ${P}`, link: 'truspace://invoices', web: `/?invoice=${inv.id}`, tag: 'invoices' }, user)
      return toOwners([inv.ownerId], { title: `${W} recorded for you`, body: `${what} · ${P}`, link: 'truspace://invoices', web: `/?invoice=${inv.id}`, tag: 'invoices' }, user)
    }
    if (prev.status === inv.status) return null
    const T = { Verified: [`${W} checked`, 'Verified by accounts, awaiting approval'], Approved: [`${W} approved`, 'Approved for payment'], Paid: ['Payment made', `Paid ${inr(inv.paidAmount || inv.net)}${inv.utr && inv.utr !== 'Deposit adjustment' ? ` · UTR ${inv.utr}` : inv.paidBy === 'Deposit' ? ' · from the deposit' : ''}`], Rejected: [`${W} sent back`, inv.reason ? `Reason: ${short(inv.reason, 80)}` : 'Please check and raise it again'] }[inv.status]
    if (!T) return null
    return toOwners([inv.ownerId], { title: T[0], body: `${what} · ${T[1]}`, link: 'truspace://invoices', web: `/?invoice=${inv.id}`, tag: `invoice:${inv.id}` }, user)
  }),

  ticketSaved: safe(async (prev, t, user) => {
    const P = await propName(t.propertyId)
    const note = text => ({ title: `${t.no} · ${P}`, body: short(text, 110), link: `truspace://ticket/${t.id}`, web: `/?ticket=${t.id}`, tag: `ticket:${t.id}` })
    const toOther = async n => (user?.role === 'owner' ? toTenant(t.propertyId, n, user) : toOwners(await propertyOwnerIds(t.propertyId), n, user))
    if (!prev) return toOther(note(`New repair: ${t.title} (${t.priority || 'P3'})`))
    const newLog = (t.log || []).length > (prev.log || []).length ? t.log[t.log.length - 1] : null
    if (prev.status !== t.status) return toOther(note(`${t.title} · now ${t.status}${newLog?.text ? ` · ${newLog.text}` : ''}`))
    if (newLog) return toOther(note(`${newLog.by || 'Update'}: ${newLog.text}`))
    return null
  }),

  inspectionSaved: safe(async (prev, I, user) => {
    if (prev && prev.status === I.status) return null
    const P = await propName(I.propertyId); const kind = I.kind === 'Move-in' ? 'Take-over' : 'Handover'
    if (I.status === 'Awaiting owner sign-off') return toOwners(I.ownerId ? [I.ownerId] : await propertyOwnerIds(I.propertyId), { title: `${kind} inspection to sign`, body: `${P} · review the record and sign in the app`, link: `truspace://inspection/${I.id}/signoff`, web: `/?inspection=${I.id}`, tag: `insp:${I.id}` }, user)
    if (I.status === 'Disputed') return toTenant(I.propertyId, { title: 'Owner disputed the inspection', body: `${P} · ${short(I.dispute, 100)}`, link: `truspace://inspection/${I.id}`, web: `/?inspection=${I.id}`, tag: `insp:${I.id}` }, user)
    if (I.status === 'Signed' && prev) return toTenant(I.propertyId, { title: `${kind} inspection signed`, body: `${P} · signed by ${I.ownerSign?.name || 'the owner'}`, link: `truspace://inspection/${I.id}/signoff`, web: `/?inspection=${I.id}`, tag: `insp:${I.id}` }, user)
    return null
  }),

  leaseSaved: safe(async (prev, L, user) => {
    const before = new Map(((prev && prev.depAdj) || []).map(a => [a.id, a]))
    const P = await propName(L.propertyId)
    for (const a of L.depAdj || []) {
      const b = before.get(a.id)
      if (!b && a.status === 'Proposed') await toOwners([a.ownerId], { title: 'Deposit request', body: `Use your deposit for ${perLabel(a.period)} rent? ${inr(a.amount)} · ${P}`, link: `truspace://owner/deposit/${a.id}`, web: `/?lease=${L.id}`, tag: `dep:${a.id}` }, user)
      else if (b && b.status !== a.status && ['Agreed', 'Declined'].includes(a.status)) await toTenant(L.propertyId, { title: `Deposit adjustment ${a.status.toLowerCase()}`, body: `${await ownerName(a.ownerId)} · ${perLabel(a.period)} · ${inr(a.amount)} · ${P}`, link: `truspace://property/${L.propertyId}`, web: `/?lease=${L.id}`, tag: `dep:${a.id}` }, user)
    }
  }),

  /** A new entry in L.extensions: tell every owner of the lease. */
  leaseExtended: safe(async (prev, L, user) => {
    const before = (prev && prev.extensions) || []; const now = L.extensions || []
    if (now.length <= before.length) return null
    const e = now[now.length - 1]; const P = await propName(L.propertyId)
    const ids = [...new Set((Array.isArray(L.owners) && L.owners.length ? L.owners.map(o => o.ownerId) : [L.ownerId]).filter(Boolean))]
    return toOwners(ids, { title: 'Lease extended', body: `${P} · now until ${fmtD(e.toEnd)}${+e.rent > 0 ? ` · rent ${inr(e.rent)} from ${fmtD(e.rentFrom)}` : ' · rent as before'}${e.ref ? ` · ${short(e.ref, 40)}` : ''}`, link: 'truspace://home', web: `/?lease=${L.id}`, tag: `lease:${L.id}` }, user)
  }),

  signupPending: safe(async u => {
    const ids = (await User.find({ role: { $in: ['admin', 'staff'] }, status: 'active' }, { _id: 1 }).lean()).map(x => x._id)
    return pushToUsers(ids, { title: 'New owner sign-up', body: `${u.name} · ${u.signup?.propertyCode || u.signup?.propertyName || 'property to link'} · approve on Portal access`, link: 'truspace://home', web: '/?access', tag: 'signups' })
  }),
  signupApproved: safe(async u => pushToUsers([u._id], { title: 'Your account is ready', body: 'Sign in to see your property, invoices and messages.', link: 'truspace://home', web: '/', tag: 'account' })),

  /** After a generic save (crud.js): route by resource. prev = the record before (null on create). */
  afterSave: safe(async (path, prev, rec, user) => {
    // live refresh for everyone concerned with the property (incl. the actor's other devices); pushes follow per event
    if (rec && rec.propertyId) { const [t, o] = await Promise.all([tenantUsers(rec.propertyId), ownerUsers(await propertyOwnerIds(rec.propertyId))]); emitUsers(t.concat(o), 'record:changed', { path, id: rec.id, propertyId: rec.propertyId }) }
    if (path === 'messages' && !prev) return notify.messageSent(rec, user)
    if (path === 'invoices') return notify.invoiceChanged(prev, rec, user)
    if (path === 'tickets') return notify.ticketSaved(prev, rec, user)
    if (path === 'inspections') return notify.inspectionSaved(prev, rec, user)
    if (path === 'leases') { await notify.leaseExtended(prev, rec, user); return notify.leaseSaved(prev, rec, user) }
    return null
  }),
}
