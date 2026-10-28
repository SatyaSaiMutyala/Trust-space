/*
 * PACE identity-hub provisioning. Lets PACE create / link / enable / disable one
 * person's TruSpace login, matched across apps by match_uuid. Guarded by the
 * X-Provisioning-Token shared secret (see middleware/provisioning.js), not JWT.
 *
 *   GET  /api/provisioning/ping
 *   POST /api/provisioning/rotate-token    { token }
 *   GET  /api/provisioning/users/lookup    ?email= | ?match_uuid=
 *   POST /api/provisioning/users           { match_uuid, email, name, password?, phone? }
 *   POST /api/provisioning/users/enable    { match_uuid? , email? }
 *   POST /api/provisioning/users/disable   { match_uuid? , email? }
 *
 * Provisioned accounts are internal TrustLab staff → role "staff".
 */
import { User, digitsOf } from '../models/auth.js'
import { hashPassword } from '../auth/password.js'
import { writeToken } from '../auth/provisioningToken.js'
import { ApiError, badRequest } from '../utils/ApiError.js'
import { ok, created } from '../utils/respond.js'

const APP = 'truspace'

/** Minimal, stable view of a user for PACE. */
const view = u => u && ({
  match_uuid: u.matchUuid || null,
  id: u._id,
  name: u.name,
  email: u.email || null,
  status: u.status,
  active: u.status === 'active',
})

const cleanEmail = e => (typeof e === 'string' ? e.trim().toLowerCase() : '')

/** Find by match_uuid first (the stable key), then by email. */
async function findUser({ match_uuid, email }) {
  if (match_uuid) { const u = await User.findOne({ matchUuid: String(match_uuid) }); if (u) return u }
  const e = cleanEmail(email)
  if (e) return User.findOne({ email: e })
  return null
}

export const provisioningController = {
  ping(req, res) {
    return ok(res, 'TruSpace provisioning is reachable.', { app: APP, time: new Date().toISOString() })
  },

  rotateToken(req, res) {
    const token = req.body?.new_token ?? req.body?.token // PACE sends `new_token`
    if (!token || String(token).trim().length < 16) throw badRequest('A new token of at least 16 characters is required.')
    writeToken(token)
    return ok(res, 'Provisioning token rotated.', { app: APP })
  },

  async lookup(req, res) {
    const u = await findUser({ match_uuid: req.query.match_uuid, email: req.query.email })
    return ok(res, u ? 'User found.' : 'No matching user.', { found: !!u, user: view(u) })
  },

  async store(req, res) {
    const b = req.body || {}
    const email = cleanEmail(b.email)
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    const match_uuid = b.match_uuid ? String(b.match_uuid) : null
    if (!email) throw badRequest('email is required.')
    if (!name) throw badRequest('name is required.')

    // Link an existing account (by match_uuid or email) rather than duplicating.
    let user = await findUser({ match_uuid, email })
    const phoneDigits = b.phone ? digitsOf(b.phone) : ''
    let passwordSet = false

    if (user) {
      user.name = name
      if (email) user.email = email
      if (match_uuid) user.matchUuid = match_uuid
      if (b.phone) { user.phone = String(b.phone).trim(); if (phoneDigits) user.phoneDigits = phoneDigits }
      if (b.password) { user.passwordHash = await hashPassword(String(b.password)); user.passwordChangedAt = new Date(); passwordSet = true }
      if (user.status === 'disabled') user.status = 'active' // re-provisioning re-enables
      user.updatedAt = new Date()
      await user.save()
      return ok(res, 'User linked.', { user: view(user), created: false, password_set: passwordSet })
    }

    // New account. A password is required to be able to sign in.
    if (!b.password) throw badRequest('password is required when creating a new user.')
    try {
      user = await User.create({
        name,
        email,
        ...(b.phone ? { phone: String(b.phone).trim(), ...(phoneDigits ? { phoneDigits } : {}) } : {}),
        role: 'staff',
        status: 'active',
        matchUuid: match_uuid,
        passwordHash: await hashPassword(String(b.password)),
        passwordChangedAt: new Date(),
      })
    } catch (e) {
      if (e?.code === 11000) throw new ApiError(409, 'A TruSpace account with this email or id already exists.', { code: 'conflict' })
      throw e
    }
    return created(res, 'User created.', { user: view(user), created: true, password_set: true })
  },

  async enable(req, res) {
    const u = await findUser(req.body || {})
    if (!u) throw new ApiError(404, 'No matching user to enable.', { code: 'not_found' })
    u.status = 'active'; u.failedLogins = 0; u.lockedUntil = undefined; u.updatedAt = new Date()
    await u.save()
    return ok(res, 'User enabled.', { user: view(u) })
  },

  async disable(req, res) {
    const u = await findUser(req.body || {})
    if (!u) throw new ApiError(404, 'No matching user to disable.', { code: 'not_found' })
    u.status = 'disabled'; u.updatedAt = new Date()
    await u.save()
    return ok(res, 'User disabled.', { user: view(u) })
  },
}
