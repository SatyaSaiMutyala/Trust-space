/*
 * requireAuth: needs "Authorization: Bearer <access token>". The token must be valid, its session must still exist
 * (so signing out takes effect at once), the account must be active and the password unchanged since sign-in.
 * requireRole(...roles): limits a route to some roles.
 */
import jwt from 'jsonwebtoken'
import { verifyAccess, verifyMedia } from '../auth/tokens.js'
import { User, Session } from '../models/auth.js'
import { ApiError } from '../utils/ApiError.js'

const unauth = (message, code = 'unauthenticated') => new ApiError(401, message, { code })

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : ''
  if (!token) throw unauth('Please sign in to continue.')
  let claims
  try { claims = verifyAccess(token) }
  catch (e) { throw e instanceof jwt.TokenExpiredError ? unauth('Your session has expired. Please sign in again.', 'token_expired') : unauth('Your sign-in is not valid. Please sign in again.') }
  const [user, session] = await Promise.all([User.findById(claims.sub).lean(), Session.exists({ _id: claims.sid })])
  if (!user || !session) throw unauth('Your session has ended. Please sign in again.', 'session_ended')
  if (user.status !== 'active') throw new ApiError(403, 'Your account is disabled. Contact TrustLab Facilities to restore access.', { code: 'account_disabled' })
  if (user.passwordChangedAt && claims.iat * 1000 < new Date(user.passwordChangedAt).getTime() - 1000) throw unauth('Your password was changed. Please sign in again.', 'session_ended')
  req.user = user
  req.sessionId = claims.sid
  next()
}

const ROLE_WORDS = { admin: 'administrators', staff: 'TrustLab staff', owner: 'property owners', franchisee: 'franchise partners' }
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) throw new ApiError(403, `Only ${roles.map(r => ROLE_WORDS[r]).join(' and ')} can do this.`, { code: 'forbidden' })
  next()
}

/** For file downloads: a normal access token, or ?t=<media token> (see auth/tokens.js). */
export async function requireMediaOrAuth(req, res, next) {
  if (req.headers.authorization) return requireAuth(req, res, next)
  const t = typeof req.query.t === 'string' ? req.query.t : ''
  if (!t) throw unauth('Please sign in to open this file.')
  let claims
  try { claims = verifyMedia(t) } catch { throw unauth('This file link has expired. Reload the page to open it again.', 'token_expired') }
  const user = await User.findById(claims.sub).lean()
  if (!user || user.status !== 'active') throw unauth('Please sign in to open this file.')
  req.user = user
  next()
}
