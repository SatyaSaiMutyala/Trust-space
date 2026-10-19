/*
 * Push notifications through Firebase Cloud Messaging (phones and browsers).
 *   registerToken / removeToken     a device's FCM token for a signed-in user (POST / DELETE /api/mobile/push-token)
 *   pushToUsers(userIds, note)      send one notification to every device of those users; dead tokens are dropped
 *   audience helpers                which users are "the owner" of a property and which are "the tenant side"
 * Needs the service-account JSON named by FIREBASE_ADMIN_FILE. Without it (tests, a fresh checkout) nothing is sent:
 * notifications are kept in `sent` so tests can assert on them, and a line is logged once.
 */
import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import { env } from '../config/env.js'
import { DeviceToken, User } from '../models/auth.js'
import { models } from '../models/index.js'

let app = null, warned = false
export const sent = [] // last notifications in log mode (tests): { userIds, title, body, data }
const DEAD = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'])

function init() {
  if (app) return app
  const file = env.push.adminFile ? path.resolve(env.push.adminFile) : ''
  if (!file || !fs.existsSync(file) || env.nodeEnv === 'test') { if (!warned && env.nodeEnv !== 'test') { console.log(`Push notifications off: ${file ? `${file} not found` : 'FIREBASE_ADMIN_FILE not set'} (notifications are logged only)`); warned = true } return null }
  try { app = admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(file, 'utf8'))) }) }
  catch (e) { if (!warned) { console.error('Push notifications off: could not load the Firebase service account —', e.message); warned = true } return null }
  return app
}
export const pushEnabled = () => !!init()

export async function registerToken(userId, token, platform) {
  const now = new Date()
  await DeviceToken.updateOne({ token }, { $set: { userId, platform: platform || 'unknown', lastSeenAt: now, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true })
}
export const removeToken = token => DeviceToken.deleteOne({ token })
export const removeUserTokens = userId => DeviceToken.deleteMany({ userId })

/**
 * note = { title, body, link (truspace://…), web (path on the web app, e.g. /?thread=p1), tag, data? }
 * Returns { users, devices, sent, failed }.
 */
export async function pushToUsers(userIds, note) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!ids.length) return { users: 0, devices: 0, sent: 0, failed: 0 }
  const data = { link: note.link || '', web: note.web || '', tag: note.tag || '', ...(note.data || {}) }
  Object.keys(data).forEach(k => { data[k] = String(data[k] ?? '') }) // FCM data values must be strings
  if (!init()) { sent.push({ userIds: ids, title: note.title, body: note.body, data }); if (sent.length > 100) sent.shift(); return { users: ids.length, devices: 0, sent: 0, failed: 0, logged: true } }
  const devices = await DeviceToken.find({ userId: { $in: ids } }).lean()
  if (!devices.length) return { users: ids.length, devices: 0, sent: 0, failed: 0 }
  const message = {
    tokens: devices.map(d => d.token),
    notification: { title: note.title, body: note.body },
    data,
    android: { priority: 'high', notification: { sound: 'default', channelId: 'truspace', tag: note.tag || undefined, clickAction: undefined } },
    apns: { payload: { aps: { sound: 'default', badge: note.badge, 'thread-id': note.tag || undefined, 'mutable-content': 0 } }, headers: { 'apns-priority': '10' } },
    webpush: { notification: { title: note.title, body: note.body, icon: '/favicon.svg', tag: note.tag || undefined }, fcmOptions: { link: note.web ? env.clientUrl + note.web : env.clientUrl } },
  }
  const r = await admin.messaging().sendEachForMulticast(message)
  const dead = []
  r.responses.forEach((x, i) => { if (!x.success && DEAD.has(x.error?.code)) dead.push(devices[i].token) })
  if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } })
  return { users: ids.length, devices: devices.length, sent: r.successCount, failed: r.failureCount }
}

/* ---------- audiences ---------- */
const active = { status: 'active' }
/** Accounts of the owner(s) given → user ids. */
export async function ownerUsers(ownerIds) { const ids = [...new Set((Array.isArray(ownerIds) ? ownerIds : [ownerIds]).filter(Boolean))]; if (!ids.length) return []; return (await User.find({ role: 'owner', ownerId: { $in: ids }, ...active }, { _id: 1 }).lean()).map(u => u._id) }
/** The tenant side of a property: TrustLab staff and admins, or the franchise partner's accounts for a franchise premises. */
export async function tenantUsers(propertyId) {
  const P = propertyId ? await models.properties.findById(propertyId, { managedBy: 1, partnerId: 1 }).lean() : null
  const q = P && P.managedBy === 'franchise' && P.partnerId ? { role: 'franchisee', partnerId: P.partnerId, ...active } : { role: { $in: ['admin', 'staff'] }, ...active }
  return (await User.find(q, { _id: 1 }).lean()).map(u => u._id)
}
/** Every owner currently or formerly on the property's leases, plus the property's own owners. */
export async function propertyOwnerIds(propertyId) {
  const [P, leases] = await Promise.all([models.properties.findById(propertyId, { ownerId: 1, owners: 1 }).lean(), models.leases.find({ propertyId }, { ownerId: 1, owners: 1 }).lean()])
  const ids = new Set()
  if (P) { if (P.ownerId) ids.add(P.ownerId); (P.owners || []).forEach(o => ids.add(o.ownerId)) }
  leases.forEach(L => { if (L.ownerId) ids.add(L.ownerId); (L.owners || []).forEach(o => ids.add(o.ownerId)) })
  return [...ids].filter(Boolean)
}
