/*
 * Simple in-memory limit per IP for sign-in endpoints (on top of the per-account lock).
 * For several API servers behind a load balancer, move this to a shared store (e.g. Redis).
 */
import { ApiError } from '../utils/ApiError.js'

const WINDOW_MS = 15 * 60 * 1000
const MAX = Number(process.env.AUTH_RATE_LIMIT) || (process.env.NODE_ENV === 'production' ? 30 : 300) // relaxed in development
const hits = new Map()

export function loginLimiter(req, res, next) {
  const now = Date.now(); const key = req.ip
  const h = hits.get(key)
  if (!h || now - h.start > WINDOW_MS) { hits.set(key, { start: now, n: 1 }); return next() }
  if (++h.n > MAX) {
    const mins = Math.ceil((h.start + WINDOW_MS - now) / 60000)
    throw new ApiError(429, `Too many sign-in attempts from this device. Please wait ${mins} minute${mins > 1 ? 's' : ''} and try again.`, { code: 'rate_limited' })
  }
  next()
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (now - h.start > WINDOW_MS) hits.delete(k) }, WINDOW_MS).unref()
