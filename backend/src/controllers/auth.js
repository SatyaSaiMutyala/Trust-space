/*
 * Sign-in and account security.
 *   POST /api/auth/login             { login (email or mobile), password, remember }
 *   POST /api/auth/refresh           uses the httpOnly refresh cookie → new access token
 *   POST /api/auth/logout            ends this session
 *   POST /api/auth/logout-all        ends every session of the signed-in user
 *   GET  /api/auth/me                the signed-in user
 *   POST /api/auth/forgot-password   { login } → reset link (always the same reply, so accounts can't be probed)
 *   POST /api/auth/reset-password    { token, password }
 *   POST /api/auth/change-password   { currentPassword, newPassword }
 */
import { User, Session, PasswordReset, digitsOf, publicUser } from '../models/auth.js'
import { hashPassword, verifyPassword, passwordProblem } from '../auth/password.js'
import { signAccess, signMedia, randomToken, sha256 } from '../auth/tokens.js'
import { ApiError, badRequest } from '../utils/ApiError.js'
import { ok } from '../utils/respond.js'
import { env } from '../config/env.js'
import { sendMail } from '../services/mailer.js'
import { templates } from '../services/mailTemplates.js'

export const REFRESH_COOKIE = 'ts_refresh'
const cookieOpts = maxAgeMs => ({ httpOnly: true, secure: env.auth.cookieSecure, sameSite: 'lax', path: '/api/auth', ...(maxAgeMs ? { maxAge: maxAgeMs } : {}) })
const firstName = n => String(n || '').split(/\s+/)[0]
const DAY = 864e5
/** Wrong-credentials message in the words of what was typed: an address → email, digits → mobile number (the phone app
    signs in with email only, the web with either). */
const wrongFor = login => `The ${String(login || '').includes('@') ? 'email' : 'mobile number'} or password is incorrect.`

/** Find an account by email or mobile number. */
function findByLogin(login) {
  const v = String(login || '').trim()
  if (v.includes('@')) return User.findOne({ email: v.toLowerCase() })
  const d = digitsOf(v)
  return d ? User.findOne({ phoneDigits: d }) : null
}

async function startSession(req, res, user, remember) {
  const token = randomToken()
  const days = remember ? env.auth.rememberDays : env.auth.refreshDays
  const s = await Session.create({ userId: user._id, tokenHash: sha256(token), remember: !!remember, userAgent: String(req.headers['user-agent'] || '').slice(0, 200), ip: req.ip, expiresAt: new Date(Date.now() + days * DAY) })
  res.cookie(REFRESH_COOKIE, token, cookieOpts(remember ? days * DAY : undefined)) // without “Remember me” the cookie ends with the browser session
  return { accessToken: signAccess({ ...user, sid: s._id }), mediaToken: signMedia(user), tokenType: 'Bearer', expiresIn: env.auth.accessTtl, sessionExpiresAt: s.expiresAt }
}

export const authController = {
  async login(req, res) {
    const { password, remember } = req.body || {}
    const login = req.body?.login ?? req.body?.email ?? req.body?.phone
    const errors = {}
    if (!String(login || '').trim()) errors.login = 'Enter your email or mobile number'
    if (!password) errors.password = 'Enter your password'
    if (Object.keys(errors).length) throw badRequest(Object.values(errors).join(' and ') + '.', errors)

    const user = await findByLogin(login)
    const WRONG = wrongFor(login)
    if (!user || !user.passwordHash) throw new ApiError(401, WRONG, { code: 'invalid_credentials' })
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000)
      throw new ApiError(423, `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}, or reset your password.`, { code: 'account_locked' })
    }
    if (user.status === 'pending') {
      if (!(await verifyPassword(String(password), user.passwordHash))) throw new ApiError(401, WRONG, { code: 'invalid_credentials' })
      throw new ApiError(403, 'Your account is waiting for approval. The facilities team checks your PAN and bank details and links your property, usually within one working day. We will email you when it is ready.', { code: 'pending_approval' })
    }
    if (user.status !== 'active') throw new ApiError(403, user.deletedAt ? 'This account was closed. Sign up again if you need access.' : 'Your account is disabled. Contact TrustLab Facilities to restore access.', { code: 'account_disabled' })

    if (!(await verifyPassword(String(password), user.passwordHash))) {
      user.failedLogins = (user.failedLogins || 0) + 1
      const left = env.auth.maxFailed - user.failedLogins
      if (left <= 0) {
        user.failedLogins = 0; user.lockedUntil = new Date(Date.now() + env.auth.lockMinutes * 60000); await user.save()
        throw new ApiError(423, `Too many failed attempts. For your security the account is locked for ${env.auth.lockMinutes} minutes. You can reset your password instead.`, { code: 'account_locked' })
      }
      await user.save()
      throw new ApiError(401, left <= 2 ? `${WRONG} ${left} attempt${left > 1 ? 's' : ''} left before the account is locked for ${env.auth.lockMinutes} minutes.` : WRONG, { code: 'invalid_credentials' })
    }

    user.failedLogins = 0; user.lockedUntil = undefined; user.lastLoginAt = new Date(); await user.save()
    const u = user.toObject()
    const tokens = await startSession(req, res, u, remember)
    return ok(res, `Welcome back, ${firstName(u.name)}.`, { user: publicUser(u), ...tokens })
  },

  async refresh(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE]
    const ended = () => { res.clearCookie(REFRESH_COOKIE, cookieOpts()); return new ApiError(401, 'Your session has ended. Please sign in again.', { code: 'session_ended' }) }
    if (!token) throw ended()
    const s = await Session.findOne({ tokenHash: sha256(token) })
    if (!s || s.expiresAt < new Date()) { if (s) await s.deleteOne(); throw ended() }
    const user = await User.findById(s.userId).lean()
    if (!user || user.status !== 'active') { await s.deleteOne(); throw ended() }
    // Rotate the refresh token on every use; the session slides forward.
    const next = randomToken()
    const days = s.remember ? env.auth.rememberDays : env.auth.refreshDays
    s.tokenHash = sha256(next); s.lastUsedAt = new Date(); s.expiresAt = new Date(Date.now() + days * DAY); await s.save()
    res.cookie(REFRESH_COOKIE, next, cookieOpts(s.remember ? days * DAY : undefined))
    return ok(res, 'Session refreshed.', { user: publicUser(user), accessToken: signAccess({ ...user, sid: s._id }), mediaToken: signMedia(user), tokenType: 'Bearer', expiresIn: env.auth.accessTtl, sessionExpiresAt: s.expiresAt })
  },

  async logout(req, res) {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (token) await Session.deleteOne({ tokenHash: sha256(token) })
    res.clearCookie(REFRESH_COOKIE, cookieOpts())
    return ok(res, 'You have been signed out.')
  },

  async logoutAll(req, res) {
    const { deletedCount } = await Session.deleteMany({ userId: req.user._id })
    res.clearCookie(REFRESH_COOKIE, cookieOpts())
    return ok(res, `Signed out on all devices (${deletedCount} session${deletedCount === 1 ? '' : 's'} ended).`)
  },

  async me(req, res) {
    return ok(res, `Signed in as ${req.user.name}.`, { user: publicUser(req.user) })
  },

  async forgotPassword(req, res) {
    const login = req.body?.login ?? req.body?.email
    if (!String(login || '').trim()) throw badRequest('Enter the email or mobile number of your account.', { login: 'Required' })
    const user = await findByLogin(login)
    const data = {}
    if (user && user.status === 'active') {
      const token = randomToken()
      await PasswordReset.create({ userId: user._id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + env.auth.resetMinutes * 60000) })
      const link = `${env.clientUrl}/?reset=${token}`
      const r = user.email ? await sendMail({ to: user.email, ...templates.passwordReset({ name: user.name, link, minutes: env.auth.resetMinutes }) }) : { sent: false }
      if (env.nodeEnv !== 'production' && !r.sent) { data.devResetToken = token; data.devResetLink = link } // no mail server: returned for testing
    }
    return ok(res, `If an account exists for “${String(login).trim()}”, we have sent a link to reset the password. The link works for ${env.auth.resetMinutes} minutes.`, Object.keys(data).length ? data : undefined)
  },

  async resetPassword(req, res) {
    const { token, password } = req.body || {}
    if (!token) throw badRequest('This reset link is incomplete. Open the link from the message again, or request a new one.')
    const problem = passwordProblem(password); if (problem) throw badRequest(problem, { password: problem })
    const r = await PasswordReset.findOne({ tokenHash: sha256(String(token)) })
    if (!r || r.usedAt || r.expiresAt < new Date()) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.', { code: 'reset_invalid' })
    const user = await User.findById(r.userId)
    if (!user || user.status !== 'active') throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.', { code: 'reset_invalid' })
    user.passwordHash = await hashPassword(password); user.passwordChangedAt = new Date(); user.failedLogins = 0; user.lockedUntil = undefined; user.updatedAt = new Date()
    await user.save()
    r.usedAt = new Date(); await r.save()
    await Session.deleteMany({ userId: user._id }) // sign out everywhere
    res.clearCookie(REFRESH_COOKIE, cookieOpts())
    return ok(res, 'Your password has been changed. Please sign in with the new password.')
  },

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword) throw badRequest('Enter your current password.', { currentPassword: 'Required' })
    const problem = passwordProblem(newPassword); if (problem) throw badRequest(problem, { newPassword: problem })
    const user = await User.findById(req.user._id)
    if (!(await verifyPassword(String(currentPassword), user.passwordHash))) throw new ApiError(400, 'Your current password is incorrect.', { code: 'invalid_credentials', errors: { currentPassword: 'Incorrect' } })
    if (await verifyPassword(String(newPassword), user.passwordHash)) throw badRequest('Choose a new password that is different from the current one.', { newPassword: 'Same as current' })
    user.passwordHash = await hashPassword(newPassword); user.passwordChangedAt = new Date(); user.updatedAt = new Date()
    await user.save()
    const { deletedCount } = await Session.deleteMany({ userId: user._id, _id: { $ne: req.sessionId } })
    // The current session keeps working: issue a fresh access token (older ones are now invalid).
    const accessToken = signAccess({ ...user.toObject(), sid: req.sessionId })
    return ok(res, `Your password has been changed.${deletedCount ? ` You were signed out on ${deletedCount} other device${deletedCount > 1 ? 's' : ''}.` : ''}`, { accessToken, mediaToken: signMedia(user), tokenType: 'Bearer', expiresIn: env.auth.accessTtl })
  },
}
