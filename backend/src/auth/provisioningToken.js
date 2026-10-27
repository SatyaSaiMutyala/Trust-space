/*
 * The shared secret PACE (the identity hub) uses to call /api/provisioning/*.
 * The active token lives in a file at the backend root (provisioning_token) so it
 * can be rotated from PACE without an env change or a restart; PROVISIONING_TOKEN
 * in .env is the fallback. Compared in constant time.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = path.resolve(HERE, '../../provisioning_token') // backend/provisioning_token

/** The current token, or '' when none is configured. File wins over env. */
export function currentToken() {
  try {
    const fromFile = fs.readFileSync(TOKEN_FILE, 'utf8').trim()
    if (fromFile) return fromFile
  } catch { /* no file yet: fall back to env */ }
  return (process.env.PROVISIONING_TOKEN || '').trim()
}

/** Write a new token to the file (used by the rotate-token endpoint). */
export function writeToken(token) {
  fs.writeFileSync(TOKEN_FILE, String(token).trim() + '\n', { mode: 0o600 })
}

/** Constant-time compare of a presented token against the configured one. */
export function tokenMatches(presented) {
  const want = currentToken()
  const got = String(presented || '')
  if (!want || !got) return false
  const a = Buffer.from(want)
  const b = Buffer.from(got)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
