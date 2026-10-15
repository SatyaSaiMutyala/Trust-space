/* Password hashing (scrypt, built into Node — no native module) and the password rules. */
import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const KEYLEN = 64

export async function hashPassword(plain) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(plain, salt, KEYLEN)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(plain, stored) {
  if (!stored || typeof plain !== 'string') return false
  const [algo, salt, key] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64')
  const actual = await scrypt(plain, Buffer.from(salt, 'base64'), expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

/** Returns a readable reason when the password is too weak, else null. */
export function passwordProblem(p) {
  if (typeof p !== 'string' || !p) return 'Enter a password.'
  if (p.length < 8) return 'Use at least 8 characters for the password.'
  if (p.length > 128) return 'The password is too long (maximum 128 characters).'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use at least one letter and one number in the password.'
  return null
}
