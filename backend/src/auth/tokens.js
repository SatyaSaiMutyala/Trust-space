/* Access tokens (JWT, short-lived) and opaque refresh / reset tokens (stored only as SHA-256 hashes). */
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const signAccess = user => jwt.sign(
  { sub: user._id, role: user.role, ownerId: user.ownerId || undefined, partnerId: user.partnerId || undefined, sid: user.sid },
  env.auth.jwtSecret, { expiresIn: env.auth.accessTtl, issuer: 'truspace' })

export const verifyAccess = token => jwt.verify(token, env.auth.jwtSecret, { issuer: 'truspace' })

export const randomToken = () => crypto.randomBytes(48).toString('base64url')
export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')

/*
 * Media token: lets <img>/<video> tags load uploaded files (they cannot send an Authorization header).
 * Only valid for GET /api/assets/:id/file?t=<token>; lasts 12 hours and is renewed with every sign-in / refresh.
 */
export const MEDIA_TTL = 12 * 3600
export const signMedia = user => jwt.sign({ sub: user._id, purpose: 'media' }, env.auth.jwtSecret, { expiresIn: MEDIA_TTL, issuer: 'truspace' })
export const verifyMedia = token => { const c = jwt.verify(token, env.auth.jwtSecret, { issuer: 'truspace' }); if (c.purpose !== 'media') throw new Error('not a media token'); return c }
