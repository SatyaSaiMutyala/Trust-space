/*
 * Owner self sign-up (phone app and web):
 *   POST /api/auth/register/start    { email }               email a six-digit code (always the same reply, so emails can't be probed)
 *   POST /api/auth/register/verify   { email, code }         → { signupToken } valid for 30 minutes
 *   POST /api/auth/register          { signupToken, password, owner: {…}, property: {…} }
 *                                    creates the owner record and a *pending* account; the facilities team approves
 *                                    it on the web (Portal access), which emails the owner
 *   POST /api/auth/delete-account    { password }  (signed in) closes the person's own account
 * Documents (PAN card, GST certificate, cancelled cheque, PoA) are uploaded first (POST /api/assets) and sent as ids.
 */
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { User, Session, EmailCode, digitsOf, publicUser } from '../models/auth.js'
import { models, Asset } from '../models/index.js'
import { hashPassword, verifyPassword, passwordProblem } from '../auth/password.js'
import { sha256 } from '../auth/tokens.js'
import { ApiError, badRequest } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'
import { env } from '../config/env.js'
import { newId } from '../utils/ids.js'
import { sendMail } from '../services/mailer.js'
import { templates } from '../services/mailTemplates.js'
import { notify } from '../services/notify.js'
import { removeUserTokens } from '../services/push.js'
import { REFRESH_COOKIE } from './auth.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/, GSTIN = /^[0-9]{2}[A-Z0-9]{13}$/, IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/, PIN = /^[1-9][0-9]{5}$/
const KINDS = ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust']
const SIGNUP_TTL = 30 * 60
const code6 = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0')
const signSignup = email => jwt.sign({ email, purpose: 'signup' }, env.auth.jwtSecret, { expiresIn: SIGNUP_TTL, issuer: 'truspace' })
const verifySignup = token => { const c = jwt.verify(token, env.auth.jwtSecret, { issuer: 'truspace' }); if (c.purpose !== 'signup') throw new Error('not a signup token'); return c }
const cleanEmail = v => String(v || '').trim().toLowerCase()
const s = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))
const initialsOf = name => String(name || 'OWN').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()

export const signupController = {
  async start(req, res) {
    const email = cleanEmail(req.body?.email)
    if (!EMAIL.test(email)) throw badRequest('Enter a valid email address.', { email: 'Enter a valid email address' })
    const existing = await User.findOne({ email }).lean()
    const data = {}
    if (existing && !existing.deletedAt) {
      // tell the person plainly — an attacker gains little, and owners often forget they already have access
      throw new ApiError(409, existing.status === 'pending' ? 'This email already has an account waiting for approval. Sign in to see its status.' : 'This email already has a TruSpace account. Sign in instead, or reset your password.', { code: 'email_taken' })
    }
    const code = code6()
    await EmailCode.deleteMany({ email, purpose: 'signup' })
    await EmailCode.create({ email, purpose: 'signup', codeHash: sha256(code), expiresAt: new Date(Date.now() + env.mail.codeMinutes * 60000) })
    const r = await sendMail({ to: email, ...templates.signupCode({ code, minutes: env.mail.codeMinutes }) })
    if (env.nodeEnv !== 'production' && !r.sent) data.devCode = code
    return ok(res, `We emailed a six-digit code to ${email}. It works for ${env.mail.codeMinutes} minutes.`, Object.keys(data).length ? data : undefined)
  },

  async verify(req, res) {
    const email = cleanEmail(req.body?.email); const code = String(req.body?.code || '').replace(/\D/g, '')
    if (!EMAIL.test(email) || code.length !== 6) throw badRequest('Enter the six-digit code from the email.', { code: 'Enter all six digits' })
    const rec = await EmailCode.findOne({ email, purpose: 'signup', usedAt: { $exists: false } }).sort({ createdAt: -1 })
    if (!rec || rec.expiresAt < new Date()) throw new ApiError(400, 'That code has expired. Ask for a new one.', { code: 'code_expired' })
    if (rec.attempts >= 5) throw new ApiError(400, 'Too many wrong attempts. Ask for a new code.', { code: 'code_locked' })
    if (rec.codeHash !== sha256(code)) { rec.attempts += 1; await rec.save(); throw new ApiError(400, 'That code is not right. Check the email and try again.', { code: 'code_wrong' }) }
    rec.usedAt = new Date(); await rec.save()
    return ok(res, 'Email confirmed.', { signupToken: signSignup(email), expiresIn: SIGNUP_TTL })
  },

  async register(req, res) {
    const b = req.body || {}
    let claims
    try { claims = verifySignup(String(b.signupToken || '')) } catch { throw new ApiError(400, 'Your email confirmation has expired. Start the sign-up again.', { code: 'signup_expired' }) }
    const email = claims.email
    const problem = passwordProblem(b.password); if (problem) throw badRequest(problem, { password: problem })
    const o = b.owner || {}; const p = b.property || {}
    const errors = {}
    const name = s(o.name); if (!name) errors.name = 'Enter your name'
    const kind = KINDS.includes(o.kind) ? o.kind : 'Individual'
    const phone = s(o.phone); if (!digitsOf(phone)) errors.phone = 'Enter a 10-digit mobile number'
    const pan = s(o.pan).toUpperCase(); if (pan && !PAN.test(pan)) errors.pan = 'PAN should look like ABCDE1234F'
    const gstin = s(o.gstin).toUpperCase(); if (gstin && !GSTIN.test(gstin)) errors.gstin = 'GSTIN should be 15 characters'
    if (gstin && pan && gstin.slice(2, 12) !== pan) errors.gstin = 'GSTIN does not contain this PAN'
    const ifsc = s(o.ifsc).toUpperCase(); if (ifsc && !IFSC.test(ifsc)) errors.ifsc = 'IFSC should look like HDFC0001234'
    const acctNo = s(o.acctNo).replace(/\s/g, ''); if (acctNo && !/^[0-9]{9,18}$/.test(acctNo)) errors.acctNo = 'Account number should be 9–18 digits'
    const addr = o.addr || {}; if (addr.pin && !PIN.test(s(addr.pin))) errors.addrPin = 'PIN code should be 6 digits'
    if (!s(p.code) && !s(p.name)) errors.property = 'Tell us the property code from your agreement, or its name and town'
    if (Object.keys(errors).length) throw badRequest(Object.values(errors)[0] + '.', errors)
    if (await User.findOne({ email, deletedAt: { $exists: false } }).lean()) throw new ApiError(409, 'This email already has a TruSpace account. Sign in instead.', { code: 'email_taken' })
    const d = digitsOf(phone); if (d && await User.findOne({ phoneDigits: d, deletedAt: { $exists: false } }).lean()) throw new ApiError(409, 'This mobile number is already used by another account.', { code: 'phone_taken' })
    // documents: asset ids → stored file references, like the web owner form
    const fileOf = async id => { if (!id || typeof id !== 'string') return undefined; const a = await Asset.findById(id).lean(); return a ? { id: a._id, url: a.url, name: a.name, type: a.type } : undefined }
    const [panFile, gstFile, chequeFile, poa] = await Promise.all([fileOf(o.panFile), fileOf(o.gstFile), fileOf(o.chequeFile), fileOf(o.poaFile)])
    const now = new Date(); const nowIso = now.toISOString()
    const ownerId = newId()
    const owner = {
      _id: ownerId, name, kind, phone, phone2: s(o.phone2), whatsapp: s(o.whatsapp) || phone, email, email2: s(o.email2), prefContact: s(o.prefContact) || 'WhatsApp', lang: s(o.lang) || 'English', callHours: s(o.callHours),
      addr: { line: s(addr.line), city: s(addr.city), state: s(addr.state), pin: s(addr.pin) }, noticeSame: o.noticeSame !== false,
      noticeAddr: o.noticeAddr ? { line: s(o.noticeAddr.line), city: s(o.noticeAddr.city), state: s(o.noticeAddr.state), pin: s(o.noticeAddr.pin), attn: s(o.noticeAddr.attn) } : undefined, noticeEmail: s(o.noticeEmail),
      pan, panName: s(o.panName), panStatus: 'Not verified', gstin, ...(panFile ? { panFile } : {}), ...(gstFile ? { gstFile } : {}),
      acctHolder: s(o.acctHolder) || name, bankName: s(o.bankName), bankBranch: s(o.bankBranch), acctNo, ifsc, acctType: s(o.acctType) || 'Savings', upi: s(o.upi), ...(chequeFile ? { chequeFile } : {}),
      bankVerified: false, bankPending: !!acctNo, bankChangedOn: nowIso.slice(0, 10),
      emergency: o.emergency ? { name: s(o.emergency.name), rel: s(o.emergency.rel), phone: s(o.emergency.phone), near: s(o.emergency.near) } : undefined,
      rep: o.rep && s(o.rep.name) ? { name: s(o.rep.name), rel: s(o.rep.rel), phone: s(o.rep.phone), email: s(o.rep.email), ...(poa ? { poa } : {}) } : undefined,
      coOwners: s(o.coOwners), invPrefix: initialsOf(name),
      signup: { propertyCode: s(p.code).toUpperCase(), propertyName: s(p.name), propertyTown: s(p.town), at: nowIso, source: s(b.source) || 'app' },
      createdAt: nowIso, updatedAt: nowIso,
    }
    owner.address = [owner.addr.line, owner.addr.city, owner.addr.state, owner.addr.pin].filter(Boolean).join(', ')
    owner.bank = [owner.bankName, owner.bankBranch].filter(Boolean).join(', ')
    await models.owners.create(owner)
    const u = await User.create({ _id: 'u-' + ownerId, name, email, phone, phoneDigits: d || undefined, passwordHash: await hashPassword(b.password), role: 'owner', ownerId, status: 'pending', signup: owner.signup, passwordChangedAt: now, createdAt: now, updatedAt: now })
    notify.signupPending(u.toObject())
    await sendMail({ to: email, ...templates.signupReceived({ name, email, propertyCode: owner.signup.propertyCode, propertyName: owner.signup.propertyName, propertyTown: owner.signup.propertyTown, pan, bank: owner.bankName ? `${owner.bankName} ····${acctNo.slice(-4)}` : '' }) })
    return created(res, 'Your account is created and waiting for approval. We will email you when it is ready, usually within one working day.', { status: 'pending', email, ownerId })
  },

  /** The signed-in person closes their own account (owners and franchise partners; staff are managed by an administrator). */
  async deleteAccount(req, res) {
    const u = await User.findById(req.user._id)
    if (!u) throw new ApiError(401, 'Please sign in again.', { code: 'session_ended' })
    if (u.role === 'admin' || u.role === 'staff') throw new ApiError(403, 'Staff accounts are closed by an administrator from Portal access.', { code: 'forbidden' })
    const password = String(req.body?.password || '')
    if (!password) throw badRequest('Enter your password to continue.', { password: 'Required' })
    if (!(await verifyPassword(password, u.passwordHash || ''))) throw new ApiError(401, 'That password is not right.', { code: 'invalid_credentials' })
    const when = new Date()
    // free the email and mobile for a future account; lease, invoice and tax records stay with the owner record
    await User.updateOne({ _id: u._id }, { $set: { status: 'disabled', deletedAt: when, updatedAt: when, email: `deleted+${u._id}+${when.getTime()}@closed.invalid`, phone: undefined }, $unset: { phoneDigits: 1 } })
    await Session.deleteMany({ userId: u._id }); await removeUserTokens(u._id)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    if (u.email) await sendMail({ to: u.email, ...templates.accountClosed({ name: u.name }) })
    return ok(res, 'Your account is deleted. Rent and tax records stay with the facilities team; contact them if you need a copy.', { id: u._id, deletedAt: when })
  },

  /** For Portal access: the people waiting (pending owner sign-ups) with what they told us. */
  async pending(req, res) {
    const users = await User.find({ status: 'pending' }).sort({ createdAt: -1 }).lean()
    const owners = Object.fromEntries((await models.owners.find({ _id: { $in: users.map(u => u.ownerId).filter(Boolean) } }).lean()).map(o => [o._id, o]))
    return ok(res, users.length ? `${users.length} sign-up${users.length === 1 ? '' : 's'} waiting for approval.` : 'No sign-ups waiting.', users.map(u => ({ ...publicUser(u), owner: owners[u.ownerId] ? { id: u.ownerId, ...owners[u.ownerId], _id: undefined } : null })))
  },
}
