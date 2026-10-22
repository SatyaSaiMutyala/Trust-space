/*
 * Portal accounts (admins and TrustLab staff only; only admins can create or change admin/staff accounts).
 *   GET    /api/users?search=&page=&limit=&role=&status=&ownerId=&partnerId=
 *   GET    /api/users/:id
 *   POST   /api/users                     { name, email?, phone?, role, ownerId?, partnerId?, password? }
 *   PATCH  /api/users/:id                 { name?, email?, phone?, role?, ownerId?, partnerId?, status? }
 *   DELETE /api/users/:id
 *   POST   /api/users/:id/unlock          clears a failed-sign-in lock
 *   PATCH  /api/users/:id                 any of the fields above; `password` sets a new one and signs the user out everywhere
 *   POST   /api/users/:id/reset-password  sets a new temporary password and signs the user out everywhere
 * Without a password, a temporary one is generated and returned once.
 */
import crypto from 'node:crypto'
import { User, Session, digitsOf, publicUser } from '../models/auth.js'
import { models } from '../models/index.js'
import { hashPassword, passwordProblem } from '../auth/password.js'
import { buildListQuery, pageInfo } from '../utils/listQuery.js'
import { ApiError, badRequest, notFound, conflict } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'
import { cap, count } from '../utils/text.js'
import { sendMail } from '../services/mailer.js'
import { templates } from '../services/mailTemplates.js'
import { notify } from '../services/notify.js'
import { removeUserTokens } from '../services/push.js'
import { env } from '../config/env.js'

const CFG = {
  singular: 'account', plural: 'accounts', search: ['name', 'email', 'phone'],
  filters: { role: {}, status: {}, ownerId: {}, partnerId: {} }, sort: { name: 1 }, dateField: 'createdAt',
}
const ROLES = ['admin', 'staff', 'owner', 'franchisee']
const ROLE_NAME = { admin: 'administrator', staff: 'TrustLab staff', owner: 'owner', franchisee: 'franchise partner' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const tempPassword = () => 'Ts' + crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + Math.floor(10 + Math.random() * 90)
const missing = id => notFound(`No account found with id “${id}”.`)
const isStaffRole = r => r === 'admin' || r === 'staff'

function clean(body) {
  const b = body || {}
  const out = {}
  for (const k of ['name', 'email', 'phone', 'role', 'ownerId', 'partnerId', 'status']) if (b[k] !== undefined) out[k] = typeof b[k] === 'string' ? b[k].trim() : b[k]
  if (out.email !== undefined) out.email = out.email ? out.email.toLowerCase() : undefined
  return out
}

/** Field checks + linked owner/partner + unique email/mobile. `rec` is the full record after the change. */
async function validate(rec, id) {
  const errors = {}
  if (!rec.name) errors.name = 'Name is required'
  if (!rec.email && !rec.phone) errors.email = 'Enter an email or a mobile number to sign in with'
  if (rec.email && !EMAIL.test(rec.email)) errors.email = `“${rec.email}” is not a valid email address`
  if (rec.phone && !digitsOf(rec.phone)) errors.phone = 'Enter a mobile number with at least 10 digits'
  if (!ROLES.includes(rec.role)) errors.role = 'Role must be one of: admin, staff, owner, franchisee'
  if (rec.role === 'owner' && !rec.ownerId) errors.ownerId = 'Choose the owner record this account belongs to'
  if (rec.role === 'franchisee' && !rec.partnerId) errors.partnerId = 'Choose the franchise partner this account belongs to'
  if (rec.status && !['active', 'disabled', 'pending'].includes(rec.status)) errors.status = 'Status must be active, disabled or pending'
  const list = Object.values(errors)
  if (list.length) throw badRequest(list.length === 1 ? list[0] + '.' : `Please fix ${list.length} fields: ${list.join('; ')}.`, errors)
  if (rec.role === 'owner' && !(await models.owners.exists({ _id: rec.ownerId }))) throw badRequest(`Owner “${rec.ownerId}” does not exist.`, { ownerId: 'Not found' })
  if (rec.role === 'franchisee' && !(await models.partners.exists({ _id: rec.partnerId }))) throw badRequest(`Franchise partner “${rec.partnerId}” does not exist.`, { partnerId: 'Not found' })
  if (rec.email) { const c = await User.findOne({ email: rec.email, _id: { $ne: id } }).lean(); if (c) throw conflict(`The email ${rec.email} is already used by the account “${c.name}”.`) }
  const d = digitsOf(rec.phone)
  if (d) { const c = await User.findOne({ phoneDigits: d, _id: { $ne: id } }).lean(); if (c) throw conflict(`The mobile number ${rec.phone} is already used by the account “${c.name}”.`) }
}

/** Staff may manage owner/franchisee accounts; only admins may touch admin/staff accounts. */
function guard(actor, ...roles) {
  if (actor.role !== 'admin' && roles.some(isStaffRole)) throw new ApiError(403, 'Only administrators can create or change TrustLab staff and administrator accounts.', { code: 'forbidden' })
}

export const usersController = {
  async list(req, res) {
    const q = buildListQuery(CFG, req.query)
    const [items, total] = await Promise.all([User.find(q.filter).sort(q.sort).skip(q.skip).limit(q.limit).lean(), User.countDocuments(q.filter)])
    // Name of the linked owner / partner, so clients can show it without loading those records.
    const ownerIds = [...new Set(items.map(u => u.ownerId).filter(Boolean))], partnerIds = [...new Set(items.map(u => u.partnerId).filter(Boolean))]
    const [os, ps] = await Promise.all([models.owners.find({ _id: { $in: ownerIds } }, { name: 1 }).lean(), models.partners.find({ _id: { $in: partnerIds } }, { name: 1 }).lean()])
    const names = Object.fromEntries([...os, ...ps].map(x => [x._id, x.name]))
    const p = pageInfo(total, q.page, q.limit)
    const message = !total ? (q.search ? `No accounts match “${q.search}”.` : 'No accounts found.')
      : `${cap(count(total, 'account', 'accounts'))} found${q.search ? ` for “${q.search}”` : ''}${p.totalPages > 1 ? ` · showing ${q.skip + 1}–${q.skip + items.length}` : ''}.`
    return ok(res, message, items.map(u => ({ ...publicUser(u), linkedName: names[u.ownerId || u.partnerId] || undefined })), p)
  },

  async get(req, res) {
    const u = await User.findById(req.params.id).lean()
    if (!u) throw missing(req.params.id)
    return ok(res, `Account “${u.name}” loaded.`, publicUser(u))
  },

  async create(req, res) {
    const rec = clean(req.body)
    rec.status = rec.status || 'active'
    if (rec.role !== 'owner') delete rec.ownerId
    if (rec.role !== 'franchisee') delete rec.partnerId
    guard(req.user, rec.role)
    await validate(rec)
    let password = req.body?.password; let generated = false
    if (password) { const p = passwordProblem(password); if (p) throw badRequest(p, { password: p }) }
    else { password = tempPassword(); generated = true }
    const now = new Date()
    const doc = await User.create({ ...rec, phoneDigits: digitsOf(rec.phone) || undefined, passwordHash: await hashPassword(password), passwordChangedAt: now, createdAt: now, updatedAt: now })
    const data = publicUser(doc.toObject())
    if (generated) data.temporaryPassword = password
    return created(res, `${cap(ROLE_NAME[rec.role])} account for ${rec.name} created.${generated ? ' Share the temporary password securely and ask them to change it after signing in.' : ''}`, data)
  },

  async update(req, res) {
    const u = await User.findById(req.params.id).lean()
    if (!u) throw missing(req.params.id)
    const changes = clean(req.body)
    const password = typeof req.body?.password === 'string' && req.body.password ? req.body.password : ''
    if (password) { const p = passwordProblem(password); if (p) throw badRequest(p, { password: p }) }
    if (!Object.keys(changes).length && !password) throw badRequest('Nothing to update — send the account fields to change.')
    guard(req.user, u.role, changes.role)
    if (u._id === req.user._id && (changes.role && changes.role !== u.role || changes.status === 'disabled')) throw badRequest('You cannot change your own role or disable your own account.')
    const rec = { ...u, ...changes }
    if (rec.role !== 'owner') rec.ownerId = undefined
    if (rec.role !== 'franchisee') rec.partnerId = undefined
    await validate(rec, u._id)
    const set = { name: rec.name, email: rec.email, phone: rec.phone, phoneDigits: digitsOf(rec.phone) || undefined, role: rec.role, ownerId: rec.ownerId, partnerId: rec.partnerId, status: rec.status, updatedAt: new Date(), ...(password ? { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), failedLogins: 0 } : {}) }
    const unset = Object.fromEntries(Object.entries(set).filter(([, v]) => v === undefined || v === '').map(([k]) => [k, 1]))
    for (const k of Object.keys(unset)) delete set[k]
    await User.updateOne({ _id: u._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) })
    if (set.status === 'disabled' || (changes.role && changes.role !== u.role) || (password && u._id !== req.user._id)) await Session.deleteMany({ userId: u._id })
    const fresh = await User.findById(u._id).lean()
    const approved = u.status === 'pending' && set.status === 'active'
    if (approved) notify.signupApproved(fresh)
    if (set.status === 'disabled') await removeUserTokens(u._id)
    if (approved && fresh.email) await sendMail({ to: fresh.email, ...templates.signupApproved({ name: fresh.name, email: fresh.email, loginUrl: env.clientUrl }) })
    return ok(res, `Account “${fresh.name}” updated.${approved ? ' They can sign in now and have been emailed.' : ''}${set.status === 'disabled' && u.status !== 'disabled' ? ' They have been signed out and can no longer sign in.' : password ? (u._id === req.user._id ? ' Your password is changed.' : ' Their password is changed and they have been signed out everywhere; share it securely.') : ''}`, publicUser(fresh))
  },

  async remove(req, res) {
    const u = await User.findById(req.params.id).lean()
    if (!u) throw missing(req.params.id)
    if (u._id === req.user._id) throw badRequest('You cannot delete your own account.')
    guard(req.user, u.role)
    await Session.deleteMany({ userId: u._id })
    await User.deleteOne({ _id: u._id })
    if (u.status === 'pending' && u.email) await sendMail({ to: u.email, ...templates.signupDeclined({ name: u.name, contact: env.mail.contact }) })
    return ok(res, `Account “${u.name}” deleted.${u.status === 'pending' ? ' The sign-up was declined and they have been emailed.' : ' They can no longer sign in.'}`, { id: u._id })
  },

  async unlock(req, res) {
    const u = await User.findById(req.params.id)
    if (!u) throw missing(req.params.id)
    guard(req.user, u.role)
    const wasLocked = u.lockedUntil && u.lockedUntil > new Date()
    u.failedLogins = 0; u.lockedUntil = undefined; await u.save()
    return ok(res, wasLocked ? `Account “${u.name}” unlocked. They can sign in again.` : `Account “${u.name}” was not locked.`, publicUser(u.toObject()))
  },

  async resetPassword(req, res) {
    const u = await User.findById(req.params.id)
    if (!u) throw missing(req.params.id)
    guard(req.user, u.role)
    const password = tempPassword()
    u.passwordHash = await hashPassword(password); u.passwordChangedAt = new Date(); u.failedLogins = 0; u.lockedUntil = undefined; u.updatedAt = new Date()
    await u.save()
    await Session.deleteMany({ userId: u._id })
    return ok(res, `New temporary password set for ${u.name}. They have been signed out everywhere; share the password securely.`, { ...publicUser(u.toObject()), temporaryPassword: password })
  },
}
