/*
 * Load the sample portfolio (same data the web app shows in preview) into MongoDB.
 *   npm run seed              replace all TruSpace collections with the sample data
 *   npm run seed -- --if-empty   only seed when the database has no properties yet
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectDb } from '../config/db.js'
import { models } from '../models/index.js'
import { RESOURCES } from '../resources/config.js'
import { User, Session, digitsOf } from '../models/auth.js'
import { hashPassword } from '../auth/password.js'

/** Sample sign-in accounts. Development only — change the password before using real data. */
export const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Trust@1234'
function seedAccounts(data) {
  return [
    { _id: 'u-admin', name: 'TrustLab Admin', email: 'admin@trustlab.example', phone: '+91 40 2776 5656', role: 'admin' },
    { _id: 'u-staff', name: 'Facilities Desk', email: 'facilities@trustlab.example', role: 'staff' },
    ...(data.owners || []).filter(o => o.email).map(o => ({ _id: 'u-' + o.id, name: o.name, email: o.email.toLowerCase(), phone: o.phone, role: 'owner', ownerId: o.id })),
    ...(data.partners || []).filter(p => p.email).map(p => ({ _id: 'u-' + p.id, name: p.name, email: p.email.toLowerCase(), phone: p.phone, role: 'franchisee', partnerId: p.id })),
  ]
}

export async function seed({ ifEmpty = false } = {}) {
  const data = JSON.parse(await fs.readFile(new URL('./sample-data.json', import.meta.url), 'utf8'))
  if (ifEmpty && await models.properties.estimatedDocumentCount()) return { skipped: true }
  const counts = {}
  for (const cfg of RESOURCES) {
    const rows = (data[cfg.path] || []).map(({ id, ...rest }) => ({ _id: id, ...rest }))
    await models[cfg.path].deleteMany({})
    if (rows.length) await models[cfg.path].insertMany(rows, { ordered: true })
    await models[cfg.path].syncIndexes()
    counts[cfg.path] = rows.length
  }
  const hash = await hashPassword(SEED_PASSWORD)
  const now = new Date()
  await Promise.all([User.deleteMany({}), Session.deleteMany({})])
  const accounts = seedAccounts(data).map(a => ({ ...a, phoneDigits: digitsOf(a.phone) || undefined, passwordHash: hash, status: 'active', passwordChangedAt: now, createdAt: now, updatedAt: now }))
  await User.insertMany(accounts)
  await User.syncIndexes()
  counts.users = accounts.length
  return { counts }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await connectDb(env.mongoUri)
    const r = await seed({ ifEmpty: process.argv.includes('--if-empty') })
    console.log(r.skipped ? 'Database already has data — nothing seeded.' : 'Sample data loaded: ' + Object.entries(r.counts).map(([k, n]) => `${n} ${k}`).join(', ') + `
Sign in with admin@trustlab.example (or any owner/partner email) and password ${SEED_PASSWORD}`)
  } catch (e) {
    console.error('Seeding failed: ' + e.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}
