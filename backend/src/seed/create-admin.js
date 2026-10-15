/*
 * Create an administrator account — the first sign-in on a fresh (empty) database. Safe in production: it only adds
 * one account and never touches other data. Everyone else can then be added from the app (Portal access).
 *   npm run create-admin -- --email admin@trustlab.in --name "Facilities Admin" [--phone "+91 98480 11223"]
 * The password comes from ADMIN_PASSWORD; without it a random password is generated and printed once.
 */
import crypto from 'node:crypto'
import { parseArgs } from 'node:util'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectDb } from '../config/db.js'
import { User, digitsOf } from '../models/auth.js'
import { hashPassword, passwordProblem } from '../auth/password.js'

const { values: a } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' } } })
const email = a.email?.trim().toLowerCase()
const name = a.name?.trim() || 'Administrator'
const tempPassword = () => 'Ts' + crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, 'x') + Math.floor(10 + Math.random() * 90)

try {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Give a valid email: npm run create-admin -- --email you@example.com --name "Your Name"')
  const password = process.env.ADMIN_PASSWORD || tempPassword()
  const weak = passwordProblem(password)
  if (weak) throw new Error('ADMIN_PASSWORD: ' + weak)
  if (a.phone && !digitsOf(a.phone)) throw new Error('Enter a mobile number with at least 10 digits.')

  await connectDb(env.mongoUri)
  if (await User.exists({ email })) throw new Error(`An account with ${email} already exists.`)
  if (a.phone && await User.exists({ phoneDigits: digitsOf(a.phone) })) throw new Error(`An account with the mobile number ${a.phone} already exists.`)
  await User.syncIndexes()

  const now = new Date()
  await User.create({ name, email, phone: a.phone, phoneDigits: digitsOf(a.phone) || undefined, role: 'admin', status: 'active', passwordHash: await hashPassword(password), passwordChangedAt: now, createdAt: now, updatedAt: now })
  console.log(`Administrator created: ${name} <${email}>`)
  if (!process.env.ADMIN_PASSWORD) console.log(`Password (shown only once): ${password}\nSave it in a password manager.`)
} catch (e) {
  console.error('Could not create the administrator: ' + e.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
