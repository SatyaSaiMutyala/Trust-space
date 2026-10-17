/*
 * API tests against an in-memory MongoDB seeded with the sample portfolio.
 *   npm test
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongo, server, base, token

before(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri('truspace')
  process.env.STORAGE_DRIVER = 'local' // tests never touch AWS; the S3 test injects its own client
  process.env.UPLOAD_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'truspace-uploads-'))
  const { connectDb } = await import('../src/config/db.js')
  const { seed } = await import('../src/seed/seed.js')
  const { default: app } = await import('../src/app.js')
  await connectDb(process.env.MONGODB_URI)
  await seed()
  await new Promise(r => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}/api`
  const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'admin@trustlab.example', password: 'Trust@1234' }) })
  token = (await r.json()).data.accessToken
})

after(async () => {
  server?.close()
  await mongoose.disconnect()
  await mongo?.stop()
  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true })
})

const call = async (method, url, body, auth = token) => {
  const headers = { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }
  const res = await fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, body: await res.json() }
}
const assertEnvelope = r => {
  assert.equal(typeof r.body.message, 'string')
  assert.ok(r.body.message.length > 3, 'message should be human readable')
  assert.equal(r.body.success, r.status < 400)
}

test('health reports database connected', async () => {
  const r = await call('GET', '/health')
  assert.equal(r.status, 200); assertEnvelope(r)
  assert.equal(r.body.data.db, 'connected')
})

test('every resource lists with pagination and a message', async () => {
  for (const p of ['properties', 'owners', 'leases', 'invoices', 'tickets', 'messages', 'inspections', 'sites', 'reqs', 'partners', 'tds', 'people']) {
    const r = await call('GET', `/${p}`)
    assert.equal(r.status, 200, p); assertEnvelope(r)
    assert.ok(Array.isArray(r.body.data))
    assert.deepEqual(Object.keys(r.body.pagination).sort(), ['hasNext', 'hasPrev', 'limit', 'page', 'total', 'totalPages'])
  }
})

test('pagination: page and limit', async () => {
  const r = await call('GET', '/invoices?page=2&limit=10')
  assert.equal(r.status, 200)
  assert.equal(r.body.data.length, 10)
  assert.equal(r.body.pagination.total, 60)
  assert.equal(r.body.pagination.totalPages, 6)
  assert.equal(r.body.pagination.hasPrev, true)
  assert.match(r.body.message, /60 invoices found · showing 11–20\./)
  const last = await call('GET', '/invoices?page=6&limit=10')
  assert.equal(last.body.data.length, 10)
  assert.equal(last.body.pagination.hasNext, false)
  const past = await call('GET', '/invoices?page=9&limit=10')
  assert.equal(past.body.data.length, 0)
  assert.match(past.body.message, /Page 9 is past the end/)
})

test('search is partial and case-insensitive', async () => {
  const r = await call('GET', '/properties?search=noida')
  assert.equal(r.body.pagination.total, 1)
  assert.equal(r.body.data[0].code, 'NOI-ZRL-01')
  assert.equal(r.body.message, '1 property found for “noida”.')
  const none = await call('GET', '/properties?search=zzz')
  assert.equal(none.body.message, 'No properties match “zzz”.')
})

test('filters, multi-value filters, date range and sort', async () => {
  const paid = await call('GET', '/invoices?status=Paid&limit=100')
  assert.ok(paid.body.data.every(i => i.status === 'Paid'))
  const multi = await call('GET', '/invoices?status=Submitted,Verified&limit=100')
  assert.ok(multi.body.data.every(i => ['Submitted', 'Verified'].includes(i.status)))
  assert.ok(multi.body.data.some(i => i.status === 'Verified') && multi.body.data.some(i => i.status === 'Submitted'))
  const p1 = await call('GET', '/tickets?propertyId=p1&priority=P1')
  assert.equal(p1.body.data.length, 1)
  const bool = await call('GET', '/owners?bankPending=true')
  assert.deepEqual(bool.body.data.map(o => o.id), ['o4'])
  const sorted = await call('GET', '/properties?sort=area&order=desc&limit=3')
  assert.deepEqual(sorted.body.data.map(p => p.id), ['p1', 'p2', 'p3'])
  const all = (await call('GET', '/invoices?limit=100')).body.data.map(i => i.date).sort()
  const from = all[Math.floor(all.length / 2)]
  const ranged = await call('GET', `/invoices?from=${from}&limit=100`)
  assert.ok(ranged.body.data.length > 0 && ranged.body.data.every(i => i.date >= from))
})

test('bad query params get readable errors', async () => {
  const r = await call('GET', '/properties?page=0')
  assert.equal(r.status, 400); assertEnvelope(r)
  assert.equal(r.body.message, '“page” must be a whole number of at least 1.')
  const b = await call('GET', '/owners?bankPending=maybe')
  assert.equal(b.body.message, '“bankPending” must be true or false.')
  const d = await call('GET', '/invoices?from=yesterday')
  assert.equal(d.body.message, '“from” must be a date like 2026-04-01.')
})

test('get one, and not found', async () => {
  const r = await call('GET', '/leases/l1')
  assert.equal(r.status, 200)
  assert.equal(r.body.message, 'Lease “TDPL-FAC-LSE-001” loaded.')
  assert.equal(r.body.data.id, 'l1')
  const nf = await call('GET', '/leases/nope')
  assert.equal(nf.status, 404); assertEnvelope(nf)
  assert.equal(nf.body.message, 'No lease found with id “nope”. It may have been deleted.')
})

test('create validates required fields, links and uniqueness', async () => {
  const empty = await call('POST', '/properties', {})
  assert.equal(empty.status, 400)
  assert.match(empty.body.message, /^Please fix 4 fields: Property name is required; Site code is required;/)
  assert.equal(empty.body.errors.name, 'Property name is required')
  const badRef = await call('POST', '/properties', { name: 'X', code: 'X-1', address: 'A', city: 'Hyd', ownerId: 'o99' })
  assert.equal(badRef.status, 400)
  assert.equal(badRef.body.message, 'Owner “o99” does not exist, so this property can’t be linked to it.')
  const dup = await call('POST', '/properties', { name: 'X', code: 'HYD-BGP-01', address: 'A', city: 'Hyd' })
  assert.equal(dup.status, 409)
  assert.equal(dup.body.message, 'Site code “HYD-BGP-01” is already used by Property “Begumpet HQ & National Reference Lab”.')
  const badEnum = await call('POST', '/tickets', { no: 'TKT-9', propertyId: 'p1', title: 'Leak', priority: 'P9' })
  assert.equal(badEnum.body.message, 'Priority must be one of: P1, P2, P3, P4.')
  const badNum = await call('POST', '/leases', { ref: 'L-X', propertyId: 'p1', start: '2026-01-01', end: '2027-01-01', rent: 'abc' })
  assert.equal(badNum.body.message, 'Monthly rent must be a number.')
  const okc = await call('POST', '/properties', { name: 'Kondapur CC', code: 'HYD-KDP-CC', address: 'Plot 88', city: 'Hyderabad', ownerId: 'o1' })
  assert.equal(okc.status, 201)
  assert.equal(okc.body.message, 'Property “Kondapur CC” created.')
  assert.ok(okc.body.data.id && okc.body.data.createdAt)
})

test('PUT creates or replaces (the app’s save), PATCH updates', async () => {
  const c = await call('PUT', '/partners/pa9', { name: 'Test Partner', status: 'Prospect' })
  assert.equal(c.status, 201); assert.equal(c.body.message, 'Franchise partner “Test Partner” created.')
  const u = await call('PUT', '/partners/pa9', { name: 'Test Partner LLP', status: 'Active' })
  assert.equal(u.status, 200); assert.equal(u.body.message, 'Franchise partner “Test Partner LLP” updated.')
  assert.equal(u.body.data.createdAt, c.body.data.createdAt)
  const p = await call('PATCH', '/partners/pa9', { city: 'Warangal' })
  assert.equal(p.status, 200)
  assert.equal(p.body.data.name, 'Test Partner LLP'); assert.equal(p.body.data.city, 'Warangal')
  const badPatch = await call('PATCH', '/partners/pa9', { status: 'Gone' })
  assert.equal(badPatch.status, 400)
  const emptyPatch = await call('PATCH', '/partners/pa9', {})
  assert.equal(emptyPatch.body.message, 'Nothing to update — send the franchise partner fields to change.')
})

test('deleting moves a record to Trash; it can be restored or deleted permanently', async () => {
  const made = await call('POST', '/tickets', { no: 'TKT-TEST-1', propertyId: 'p1', title: 'Trash test ticket', category: 'Other', priority: 'P4', status: 'Open', raisedBy: 'test' })
  assert.equal(made.status, 201, made.body.message); const id = made.body.data.id
  let r = await call('DELETE', `/tickets/${id}`); assert.equal(r.status, 200); assert.match(r.body.message, /moved to Trash/)
  assert.equal((await call('GET', `/tickets/${id}`)).status, 404, 'hidden from get')
  assert.ok(!(await call('GET', '/tickets?limit=100&search=Trash test')).body.data.some(t => t.id === id), 'hidden from lists')
  r = await call('GET', '/trash'); assert.equal(r.status, 200); assertEnvelope(r)
  const cat = r.body.data.categories.find(c => c.resource === 'tickets'); assert.ok(cat && cat.items.some(i => i.id === id && i.label && i.deletedAt && i.sub))
  r = await call('POST', `/trash/tickets/${id}/restore`); assert.equal(r.status, 200); assert.match(r.body.message, /restored/)
  assert.equal((await call('GET', `/tickets/${id}`)).status, 200, 'back after restore')
  await call('DELETE', `/tickets/${id}`)
  r = await call('DELETE', `/trash/tickets/${id}`); assert.equal(r.status, 200); assert.match(r.body.message, /deleted permanently/)
  assert.equal((await call('GET', `/trash/tickets/${id}/restore`)).status, 404)
  assert.ok(!(await call('GET', '/trash')).body.data.categories.some(c => c.items.some(i => i.id === id)))
  // owners only see their own trashed records; only admins may empty the Trash
  const { accessToken: o1 } = await tokenFor('sr.kondapalli@example.com')
  assert.equal((await call('GET', '/trash', undefined, o1)).status, 200)
  const { accessToken: staff } = await tokenFor('facilities@trustlab.example')
  assert.equal((await call('DELETE', '/trash', undefined, staff)).status, 403)
})

test('delete is blocked while dependents exist, then succeeds', async () => {
  const blocked = await call('DELETE', '/properties/p1')
  assert.equal(blocked.status, 409); assertEnvelope(blocked)
  assert.match(blocked.body.message, /^Property “Begumpet HQ & National Reference Lab” can’t be deleted because it still has 1 lease and 2 tickets and 18 invoices\./)
  const del = await call('DELETE', '/partners/pa9')
  assert.equal(del.status, 200); assert.equal(del.body.message, 'Franchise partner “Test Partner LLP” moved to Trash.')
  const gone = await call('DELETE', '/partners/pa9')
  assert.equal(gone.status, 404)
})

test('invalid JSON and unknown routes get readable messages', async () => {
  const res = await fetch(base + '/owners', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: '{bad' })
  const body = await res.json()
  assert.equal(res.status, 400)
  assert.equal(body.message, 'The request body is not valid JSON. Please check the data and try again.')
  const nr = await call('GET', '/nothing-here')
  assert.equal(nr.status, 404)
  assert.equal(nr.body.message, 'There is no API at GET /api/nothing-here. Check the address and method.')
})

test('asset upload, list, fetch file, delete; type and size checks', async () => {
  const fd = new FormData()
  fd.append('file', new Blob([Buffer.from('%PDF-1.4 test')], { type: 'application/pdf' }), 'lease.pdf')
  let res = await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
  let body = await res.json()
  assert.equal(res.status, 201); assert.equal(body.message, 'PDF “lease.pdf” uploaded.')
  const { id, url } = body.data
  const file = await fetch(base.replace('/api', '') + url, { headers: { Authorization: 'Bearer ' + token } })
  assert.equal(file.status, 200)
  const list = await call('GET', '/assets?search=lease&type=pdf')
  assert.equal(list.body.pagination.total, 1); assert.equal(list.body.message, '1 file found for “lease”.')

  const bad = new FormData()
  bad.append('file', new Blob(['x'], { type: 'application/zip' }), 'a.zip')
  res = await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: bad }); body = await res.json()
  assert.equal(res.status, 415); assert.equal(body.code, 'unsupported_type')
  assert.equal(body.message, '“a.zip” can’t be uploaded — only photos, videos and PDF files are allowed.')

  const big = new FormData()
  big.append('file', new Blob([Buffer.alloc(21 * 1024 * 1024)], { type: 'video/mp4' }), 'big.mp4')
  res = await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: big }); body = await res.json()
  assert.equal(res.status, 413); assert.equal(body.code, 'too_large')

  const del = await call('DELETE', `/assets/${id}`)
  assert.equal(del.body.message, 'File “lease.pdf” deleted.')
  const gone = await fetch(base.replace('/api', '') + url, { headers: { Authorization: 'Bearer ' + token } })
  assert.equal(gone.status, 404)
})

test('S3 storage: upload to bucket “trust-space”, signed download link, delete, readable errors', async () => {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const { createS3Storage, setStorage, storage } = await import('../src/storage/index.js')
  const sent = []
  let fail = null
  const client = new S3Client({ region: 'ap-south-1', credentials: { accessKeyId: 'AKIATEST', secretAccessKey: 'secret' } })
  client.send = async cmd => { if (fail) throw fail; sent.push({ op: cmd.constructor.name, input: cmd.input }); return {} }
  const local = storage()
  setStorage(createS3Storage({ bucket: 'trust-space', region: 'ap-south-1', client }))
  try {
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from('jpegdata')], { type: 'image/jpeg' }), 'Front View.JPG')
    let res = await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
    let body = await res.json()
    assert.equal(res.status, 201); assert.equal(body.message, 'Photo “Front View.JPG” uploaded.')
    assert.equal(body.data.storage, 's3'); assert.equal(body.data.bucket, 'trust-space')
    assert.match(body.data.key, /^uploads\/\d{4}\/\d{2}\/[a-z0-9]+\.jpg$/)
    const put = sent.find(s => s.op === 'PutObjectCommand')
    assert.equal(put.input.Bucket, 'trust-space'); assert.equal(put.input.Key, body.data.key); assert.equal(put.input.ContentType, 'image/jpeg')

    const id = body.data.id
    res = await fetch(base + `/assets/${id}/file`, { redirect: 'manual', headers: { Authorization: 'Bearer ' + token } })
    assert.equal(res.status, 302)
    const loc = res.headers.get('location')
    assert.match(loc, /trust-space/); assert.match(loc, /X-Amz-Signature=/); assert.ok(loc.includes(body.data.key.split('/').pop()))

    const one = await call('GET', `/assets/${id}`)
    assert.match(one.body.data.downloadUrl, /X-Amz-Signature=/)

    const del = await call('DELETE', `/assets/${id}`)
    assert.equal(del.body.message, 'File “Front View.JPG” deleted.')
    assert.equal(sent.at(-1).op, 'DeleteObjectCommand'); assert.equal(sent.at(-1).input.Bucket, 'trust-space')

    fail = Object.assign(new Error('Access Denied'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } })
    const fd2 = new FormData()
    fd2.append('file', new Blob(['x'], { type: 'application/pdf' }), 'a.pdf')
    res = await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd2 }); body = await res.json()
    assert.equal(res.status, 502); assert.equal(body.code, 'storage_unavailable')
    assert.equal(body.message, 'TruSpace is not allowed to save files in the S3 bucket “trust-space”. Check the AWS access keys and the bucket permissions.')

    const h = await call('GET', '/health?storage=check')
    assert.equal(h.status, 503); assert.equal(h.body.data.storage.bucket, 'trust-space')
    fail = null
    const h2 = await call('GET', '/health?storage=check')
    assert.equal(h2.status, 200); assert.match(h2.body.message, /files are stored in S3 bucket “trust-space” \(access checked\)/)
  } finally { setStorage(local) }
})

/* ---------------- Authentication ---------------- */
const login = (body, headers = {}) => fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
const cookieOf = res => (res.headers.get('set-cookie') || '').split(';')[0]

test('data APIs require sign-in; health and unknown routes stay readable', async () => {
  const r = await call('GET', '/properties', undefined, null)
  assert.equal(r.status, 401); assert.equal(r.body.message, 'Please sign in to continue.')
  const bad = await call('GET', '/properties', undefined, 'not-a-token')
  assert.equal(bad.status, 401); assert.equal(bad.body.message, 'Your sign-in is not valid. Please sign in again.')
  assert.equal((await call('GET', '/health', undefined, null)).status, 200)
  assert.equal((await call('GET', '/nope', undefined, null)).status, 404)
})

test('login with email or mobile, wrong password messages, me', async () => {
  let res = await login({ login: '', password: '' }); let body = await res.json()
  assert.equal(res.status, 400); assert.equal(body.message, 'Enter your email or mobile number and Enter your password.')
  res = await login({ login: 'nobody@x.com', password: 'whatever1' }); body = await res.json()
  assert.equal(res.status, 401); assert.equal(body.message, 'The email/mobile number or password is incorrect.')
  res = await login({ login: '98480 11223', password: 'Trust@1234', remember: true }); body = await res.json()
  assert.equal(res.status, 200); assert.equal(body.message, 'Welcome back, Srinivasa.')
  assert.equal(body.data.user.role, 'owner'); assert.equal(body.data.user.ownerId, 'o1'); assert.equal(body.data.tokenType, 'Bearer')
  assert.equal(body.data.user.passwordHash, undefined)
  assert.match(res.headers.get('set-cookie'), /ts_refresh=.+HttpOnly/i)
  const me = await call('GET', '/auth/me', undefined, body.data.accessToken)
  assert.equal(me.body.message, 'Signed in as Srinivasa Rao Kondapalli.')
})

test('account locks after repeated wrong passwords; admin can unlock', async () => {
  let body
  for (let i = 1; i <= 5; i++) body = await (await login({ login: 'ln.pydi@example.com', password: 'wrong-pass1' })).json()
  assert.match(body.message, /^Too many failed attempts\. For your security the account is locked for 15 minutes/)
  const locked = await (await login({ login: 'ln.pydi@example.com', password: 'Trust@1234' })).json()
  assert.match(locked.message, /^Too many failed attempts\. Try again in 15 minutes/)
  const un = await call('POST', '/users/u-o3/unlock')
  assert.equal(un.body.message, 'Account “Lakshmi Narayana Pydi” unlocked. They can sign in again.')
  assert.equal((await login({ login: 'ln.pydi@example.com', password: 'Trust@1234' })).status, 200)
})

test('refresh rotates the cookie; logout ends the session and its access token', async () => {
  const res = await login({ login: 'facilities@trustlab.example', password: 'Trust@1234' })
  const { accessToken } = (await res.json()).data
  const c1 = cookieOf(res)
  const r1 = await fetch(base + '/auth/refresh', { method: 'POST', headers: { Cookie: c1 } })
  const b1 = await r1.json()
  assert.equal(r1.status, 200); assert.equal(b1.message, 'Session refreshed.')
  const c2 = cookieOf(r1); assert.notEqual(c2, c1)
  const reuse = await fetch(base + '/auth/refresh', { method: 'POST', headers: { Cookie: c1 } })
  assert.equal(reuse.status, 401) // the old refresh token no longer works
  const out = await fetch(base + '/auth/logout', { method: 'POST', headers: { Cookie: c2 } })
  assert.equal((await out.json()).message, 'You have been signed out.')
  const after = await call('GET', '/properties', undefined, accessToken)
  assert.equal(after.status, 401); assert.equal(after.body.message, 'Your session has ended. Please sign in again.')
  const noCookie = await (await fetch(base + '/auth/refresh', { method: 'POST' })).json()
  assert.equal(noCookie.message, 'Your session has ended. Please sign in again.')
})

test('forgot and reset password', async () => {
  const f = await call('POST', '/auth/forgot-password', { login: 'padma.g@example.com' }, null)
  assert.equal(f.status, 200)
  assert.equal(f.body.message, 'If an account exists for “padma.g@example.com”, we have sent a link to reset the password. The link works for 30 minutes.')
  const unknown = await call('POST', '/auth/forgot-password', { login: 'ghost@example.com' }, null)
  assert.equal(unknown.body.message, 'If an account exists for “ghost@example.com”, we have sent a link to reset the password. The link works for 30 minutes.')
  assert.equal(unknown.body.data, undefined)
  const weak = await call('POST', '/auth/reset-password', { token: f.body.data.devResetToken, password: 'short' }, null)
  assert.equal(weak.body.message, 'Use at least 8 characters for the password.')
  const r = await call('POST', '/auth/reset-password', { token: f.body.data.devResetToken, password: 'NewPass2026' }, null)
  assert.equal(r.body.message, 'Your password has been changed. Please sign in with the new password.')
  const again = await call('POST', '/auth/reset-password', { token: f.body.data.devResetToken, password: 'NewPass2026' }, null)
  assert.equal(again.body.message, 'This reset link is invalid or has expired. Please request a new one.')
  assert.equal((await login({ login: 'padma.g@example.com', password: 'Trust@1234' })).status, 401)
  assert.equal((await login({ login: 'padma.g@example.com', password: 'NewPass2026' })).status, 200)
})

test('change password keeps this session and ends others', async () => {
  const a = (await (await login({ login: 'vgupta.m@example.com', password: 'Trust@1234' })).json()).data.accessToken
  const b = (await (await login({ login: 'vgupta.m@example.com', password: 'Trust@1234' })).json()).data.accessToken
  const wrong = await call('POST', '/auth/change-password', { currentPassword: 'nope', newPassword: 'Better2026' }, a)
  assert.equal(wrong.body.message, 'Your current password is incorrect.')
  const changed = await call('POST', '/auth/change-password', { currentPassword: 'Trust@1234', newPassword: 'Better2026' }, a)
  assert.equal(changed.body.message, 'Your password has been changed. You were signed out on 1 other device.')
  assert.equal((await call('GET', '/auth/me', undefined, changed.body.data.accessToken)).status, 200)
  assert.equal((await call('GET', '/auth/me', undefined, b)).status, 401)
})

test('user management: search/pagination, roles, temporary passwords, permissions', async () => {
  const list = await call('GET', '/users?search=example&role=owner&page=1&limit=3')
  assert.equal(list.status, 200); assert.equal(list.body.data.length, 3)
  assert.match(list.body.message, /^8 accounts found for “example” · showing 1–3\.$/)
  assert.ok(list.body.data.every(u => u.passwordHash === undefined))

  const c = await call('POST', '/users', { name: 'Ravi Kumar', email: 'ravi@trustlab.example', role: 'staff' })
  assert.equal(c.status, 201)
  assert.equal(c.body.message, 'TrustLab staff account for Ravi Kumar created. Share the temporary password securely and ask them to change it after signing in.')
  assert.equal((await login({ login: 'ravi@trustlab.example', password: c.body.data.temporaryPassword })).status, 200)

  const dup = await call('POST', '/users', { name: 'X', email: 'ravi@trustlab.example', role: 'staff' })
  assert.equal(dup.status, 409); assert.equal(dup.body.message, 'The email ravi@trustlab.example is already used by the account “Ravi Kumar”.')
  const noOwner = await call('POST', '/users', { name: 'Y', email: 'y@example.com', role: 'owner' })
  assert.equal(noOwner.body.message, 'Choose the owner record this account belongs to.')

  const staffTok = (await (await login({ login: 'ravi@trustlab.example', password: c.body.data.temporaryPassword })).json()).data.accessToken
  const denied = await call('POST', '/users', { name: 'Z', email: 'z@trustlab.example', role: 'admin' }, staffTok)
  assert.equal(denied.status, 403); assert.equal(denied.body.message, 'Only administrators can create or change TrustLab staff and administrator accounts.')
  const ownerTok = (await (await login({ login: 'saikrupa@example.com', password: 'Trust@1234' })).json()).data.accessToken
  const ownerTry = await call('GET', '/users', undefined, ownerTok)
  assert.equal(ownerTry.status, 403); assert.equal(ownerTry.body.message, 'Only administrators and TrustLab staff can do this.')

  const dis = await call('PATCH', '/users/u-o6', { status: 'disabled' })
  assert.equal(dis.body.message, 'Account “Sai Krupa Constructions” updated. They have been signed out and can no longer sign in.')
  assert.equal((await call('GET', '/auth/me', undefined, ownerTok)).status, 401)
  const blocked = await (await login({ login: 'saikrupa@example.com', password: 'Trust@1234' })).json()
  assert.equal(blocked.message, 'Your account is disabled. Contact TrustLab Facilities to restore access.')
})

/* ---------------- Role scope, computed filters, media links ---------------- */
const tokenFor = async email => (await (await login({ login: email, password: 'Trust@1234' })).json()).data

test('owners only see and change their own premises and linked records', async () => {
  const { accessToken: t } = await tokenFor('accounts@meridian.example.com') // owner o2 → property p2
  const props = await call('GET', '/properties?limit=100', undefined, t)
  assert.deepEqual(props.body.data.map(p => p.id), ['p2'])
  assert.equal(props.body.message, '1 property found.')
  const inv = await call('GET', '/invoices?limit=100', undefined, t)
  assert.ok(inv.body.data.length > 0 && inv.body.data.every(i => i.propertyId === 'p2'))
  const owners = await call('GET', '/owners', undefined, t)
  assert.deepEqual(owners.body.data.map(o => o.id), ['o2'])
  assert.equal((await call('GET', '/sites', undefined, t)).body.pagination.total, 0)
  const other = await call('GET', '/leases/l1', undefined, t)
  assert.equal(other.status, 404)
  const sneaky = await call('PUT', '/tickets/tkx', { no: 'TKT-X1', propertyId: 'p1', title: 'Not mine', priority: 'P3' }, t)
  assert.equal(sneaky.status, 403); assert.equal(sneaky.body.message, 'You can only add or change tickets for your own premises.')
  const mine = await call('PUT', '/tickets/tky', { no: 'TKT-Y1', propertyId: 'p2', title: 'Shutter noise', priority: 'P3' }, t)
  assert.equal(mine.status, 201)
})

test('franchise partners see their premises, requirements and sites only', async () => {
  const { accessToken: t } = await tokenFor('medpoint@example.com') // partner pa2 → premises p7, req r9, site s7
  assert.deepEqual((await call('GET', '/properties', undefined, t)).body.data.map(p => p.id), ['p7'])
  assert.deepEqual((await call('GET', '/reqs', undefined, t)).body.data.map(r => r.id), ['r9'])
  assert.deepEqual((await call('GET', '/sites', undefined, t)).body.data.map(s => s.id), ['s7'])
  assert.deepEqual((await call('GET', '/partners', undefined, t)).body.data.map(p => p.id), ['pa2'])
})

test('computed filters: open and overdue invoices, open tickets', async () => {
  const today = new Date().toLocaleDateString('en-CA')
  const od = await call('GET', '/invoices?overdue=true&limit=100')
  assert.ok(od.body.data.length > 0)
  assert.ok(od.body.data.every(i => !['Paid', 'Rejected'].includes(i.status) && i.dueDate < today))
  const open = await call('GET', '/invoices?open=true&limit=100')
  assert.ok(open.body.data.every(i => !['Paid', 'Rejected'].includes(i.status)))
  const t = await call('GET', '/tickets?open=true&limit=100')
  assert.ok(t.body.data.length > 0 && t.body.data.every(x => !['Resolved', 'Closed'].includes(x.status)))
})

test('uploaded files open with a media token in the URL', async () => {
  const { mediaToken } = await tokenFor('admin@trustlab.example')
  assert.ok(mediaToken)
  const fd = new FormData()
  fd.append('file', new Blob([Buffer.from('%PDF-1.4')], { type: 'application/pdf' }), 'm.pdf')
  const up = await (await fetch(base + '/assets', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })).json()
  const fileUrl = base.replace('/api', '') + up.data.url
  assert.equal((await fetch(fileUrl)).status, 401)
  assert.equal((await fetch(fileUrl + '?t=' + mediaToken)).status, 200)
  const bad = await (await fetch(fileUrl + '?t=junk')).json()
  assert.equal(bad.message, 'This file link has expired. Reload the page to open it again.')
})

test('co-owners see the shared premises and lease, but only their own invoices and owner record', async () => {
  const { accessToken: t } = await tokenFor('sravani.pydi@example.com') // o8 co-owns l3 (p3) with o3, 60:40
  assert.deepEqual((await call('GET', '/properties', undefined, t)).body.data.map(p => p.id), ['p3'])
  assert.deepEqual((await call('GET', '/leases', undefined, t)).body.data.map(l => l.id), ['l3'])
  const inv = await call('GET', '/invoices?limit=100', undefined, t)
  assert.ok(inv.body.data.length > 0 && inv.body.data.every(i => i.ownerId === 'o8'))
  assert.deepEqual((await call('GET', '/owners', undefined, t)).body.data.map(o => o.id).sort(), ['o3', 'o8'])
  assert.equal((await call('PATCH', '/owners/o3', { callHours: '9 am – 5 pm' }, t)).status, 403)
  assert.equal((await call('PATCH', '/owners/o8', { callHours: '9 am – 5 pm' }, t)).status, 200)
  const forOther = await call('PUT', '/invoices/iv-x', { number: 'SVP/X/1', propertyId: 'p3', leaseId: 'l3', ownerId: 'o3', type: 'Rent', period: '2026-10', date: '2026-10-16', base: 1000 }, t)
  assert.equal(forOther.status, 403)
})

test('leases: co-owner shares, deposit adjustments and opening balances are validated', async () => {
  const L = (await call('GET', '/leases/l3')).body.data
  assert.equal(L.owners.length, 2)
  const put = body => call('PUT', '/leases/l3', { ...L, ...body })
  const shares = await put({ owners: [{ ...L.owners[0] }, { ...L.owners[1], rent: 30 }] })
  assert.equal(shares.status, 400); assert.equal(shares.body.message, 'Rent shares add up to 90% — they must total 100%.')
  const twice = await put({ owners: [L.owners[0], { ...L.owners[1], ownerId: 'o3' }] })
  assert.match(twice.body.message, /The same owner is listed twice/) // also flags o8's opening-balance rows, now orphaned
  const tooMuch = await put({ depAdj: [{ id: 'dx', period: '2026-11', ownerId: 'o8', amount: 300000, status: 'Proposed' }] })
  assert.equal(tooMuch.status, 400); assert.equal(tooMuch.body.message, 'Deposit adjustments for Sravani Pydi total ₹3,00,000, more than the security deposit of ₹2,04,000.')
  const late = await put({ opening: { ...L.opening, items: [{ id: 'x', period: '2026-04', type: 'Rent', ownerId: 'o3', amount: 1000 }] } })
  assert.equal(late.body.message, 'Apr 2026 is on or after 2026-04-01 — record it as an invoice instead.')
  const overpaid = await put({ opening: { ...L.opening, items: [{ id: 'x', period: '2026-03', type: 'Rent', ownerId: 'o3', amount: 1000, paidAmount: 1200, paidOn: '2026-04-10' }] } })
  assert.equal(overpaid.body.message, 'Rent for Mar 2026: paid ₹1,200 including TDS is more than the ₹1,000 due.')
  const ok = await put({ depAdj: [{ id: 'd1', period: '2026-11', ownerId: 'o8', amount: 30000, tds: 0, status: 'Proposed' }] })
  assert.equal(ok.status, 200)
  assert.deepEqual((await call('GET', '/leases?ownerId=o8')).body.data.map(l => l.id), ['l3'])
  const del = await call('DELETE', '/owners/o8')
  assert.equal(del.status, 409); assert.equal(del.body.message, 'Owner “Sravani Pydi” can’t be deleted because it still has 1 lease. Delete or move those first.')
  const notOnLease = await call('PUT', '/invoices/iv-bad', { number: 'SVP/26-27/099', propertyId: 'p1', leaseId: 'l1', ownerId: 'o8', type: 'Rent', period: '2026-10', date: '2026-10-16', base: 1000 })
  assert.equal(notOnLease.status, 400); assert.equal(notOnLease.body.message, 'Owner “o8” is not an owner on lease TDPL-FAC-LSE-001, so this invoice can’t be raised in their name.')
  const cert = await call('PATCH', '/owners/o2', { tdsCert: { type: 'Lower', rate: 15, from: '2026-04-01', to: '2027-03-31' } })
  assert.equal(cert.status, 400); assert.equal(cert.body.message, 'Certificate TDS rate must be between 0% and 10%.')
})

test('invoice amounts are computed by the server from the lease and owner, whatever the client sends', async () => {
  const inv = { number: 'TEST/26-27/901', propertyId: 'p2', leaseId: 'l2', ownerId: 'o2', type: 'Rent', period: '2026-11', date: '2026-11-01', dueDate: '2026-11-07', base: 231525, gst: 1, rcm: 99, tds: 1, total: 1, net: 1, status: 'Submitted', source: 'Generated' }
  // 10% TDS with a valid PAN; GST 18% because the owner is registered and the form ticked GST
  let r = await call('PUT', '/invoices/t-inv-901', inv)
  assert.equal(r.status, 201, r.body.message)
  assert.deepEqual([r.body.data.gst, r.body.data.rcm, r.body.data.tds, r.body.data.total, r.body.data.net, r.body.data.tdsRate, r.body.data.computedBy], [41675, 0, 23153, 273200, 250047, 10, 'server'])
  // GST unticked → no GST; electricity never attracts TDS
  r = await call('PUT', '/invoices/t-inv-902', { ...inv, number: 'TEST/26-27/902', type: 'Electricity', base: 10000, gst: 0 })
  assert.deepEqual([r.body.data.gst, r.body.data.tds, r.body.data.net], [0, 0, 10000])
  // owner loses their valid PAN → a NEW invoice gets 20%, but a status change on the existing one keeps its 10%
  const o2 = (await call('GET', '/owners/o2')).body.data
  r = await call('PATCH', '/owners/o2', { panStatus: 'Inoperative' }); assert.equal(r.status, 200, r.body.message)
  r = await call('PUT', '/invoices/t-inv-903', { ...inv, number: 'TEST/26-27/903' })
  assert.deepEqual([r.body.data.tds, r.body.data.tdsRate, r.body.data.net], [46305, 20, 226895])
  r = await call('PUT', '/invoices/t-inv-901', { ...inv, status: 'Verified' })
  assert.equal(r.status, 200); assert.deepEqual([r.body.data.status, r.body.data.tds, r.body.data.net], ['Verified', 23153, 250047])
  // changing the amount recomputes again, now at 20%
  r = await call('PATCH', '/invoices/t-inv-901', { base: 100000 })
  assert.deepEqual([r.body.data.gst, r.body.data.tds, r.body.data.net], [18000, 20000, 98000])
  await call('PATCH', '/owners/o2', { panStatus: o2.panStatus ?? null })
  // an invoice recorded before this rule existed (no computedBy) keeps its amounts on a status-only save, and is only recomputed when an input changes
  const { models } = await import('../src/models/index.js')
  await models.invoices.create({ _id: 't-inv-904', ...inv, number: 'TEST/26-27/904', gst: 5, rcm: 0, tds: 5, total: 5, net: 5 })
  r = await call('PUT', '/invoices/t-inv-904', { ...inv, number: 'TEST/26-27/904', gst: 5, rcm: 0, tds: 5, total: 5, net: 5, status: 'Paid', paidAmount: 5 })
  assert.deepEqual([r.body.data.status, r.body.data.tds, r.body.data.net, r.body.data.computedBy], ['Paid', 5, 5, undefined])
  r = await call('PATCH', '/invoices/t-inv-904', { period: '2026-12' })
  assert.deepEqual([r.body.data.tds, r.body.data.net, r.body.data.computedBy], [23153, 250047, 'server'])
  for (const id of ['t-inv-901', 't-inv-902', 't-inv-903', 't-inv-904']) await call('DELETE', '/invoices/' + id)
})

test('deposit held, candidates and settlement are computed by the server; TDS on a deposit adjustment is derived on save', async () => {
  let r = await call('GET', '/leases/l5/deposit'); assert.equal(r.status, 200, r.body.message); assertEnvelope(r)
  let d = r.body.data
  assert.equal(d.deposit, 228000); assert.equal(d.held, d.deposit - d.adjusted); assert.equal(d.owners.length, 1)
  assert.equal(d.owners[0].available, d.owners[0].held - d.owners[0].proposed); assert.ok(d.candidates.length)
  assert.equal(d.settlement.refund, d.held - d.settlement.deductions); assert.equal(d.settlement.rows[0].due, d.settlement.refund)
  d = (await call('GET', '/leases/l3/deposit')).body.data
  assert.deepEqual(d.owners.map(o => [o.ownerId, o.share]), [['o3', 306000], ['o8', 204000]]); assert.equal(d.multi, true)
  assert.equal((await call('GET', '/leases/nope/deposit')).status, 404)
  r = await call('GET', '/deposits'); assert.equal(r.status, 200); assert.ok(r.body.data.held > 0); assert.ok(!r.body.data.leases.some(l => l.leaseId === 'l6'))
  // a new adjustment arrives with a made-up TDS: the server replaces it with the schedule's figure (10% of the net rent for that month)
  const L = (await call('GET', '/leases/l1')).body.data
  const adj = { id: 't-adj-1', period: '2026-11', ownerId: 'o1', amount: 100000, tds: 999, status: 'Proposed', note: 'test', createdAt: new Date().toISOString(), createdBy: 'test' }
  r = await call('PUT', '/leases/l1', { ...L, depAdj: (L.depAdj || []).concat(adj) }); assert.equal(r.status, 200, r.body.message)
  const saved = r.body.data.depAdj.find(a => a.id === 't-adj-1'); assert.equal(saved.tds, 7360, '2% — the owner’s lower-deduction certificate applies from Nov 2026'); assert.equal(saved.amount, 100000)
  // a status change alone keeps it; a changed month recomputes it
  r = await call('PUT', '/leases/l1', { ...r.body.data, depAdj: r.body.data.depAdj.map(a => a.id === 't-adj-1' ? { ...a, status: 'Cancelled', tds: 5 } : a) })
  assert.equal(r.body.data.depAdj.find(a => a.id === 't-adj-1').tds, 5)
  await call('PUT', '/leases/l1', L)
})

test('opening balances, schedule pre-fill and payment defaults are computed by the server', async () => {
  let r = await call('GET', '/opening'); assert.equal(r.status, 200, r.body.message); assertEnvelope(r)
  const d = r.body.data
  assert.equal(d.asOf, '2026-04-01'); assert.ok(d.leases.length >= 5); assert.ok(!d.leases.some(l => l.leaseId === 'l6'))
  assert.equal(d.totals.due, d.leases.reduce((a, l) => a + l.total, 0)); assert.equal(d.totals.outstanding, d.leases.reduce((a, l) => a + l.outstanding, 0))
  assert.ok(d.leases.every(l => l.items.every(it => it.out === Math.max(0, (+it.amount || 0) - (+it.paidAmount || 0) - (+it.tds || 0)))))
  const l3 = d.leases.find(l => l.leaseId === 'l3'); assert.ok(l3.items.some(it => it.ownerId === 'o8') && l3.items.some(it => it.ownerId === 'o3'))
  // an owner sees their own items only
  const { accessToken: o8 } = await tokenFor('sravani.pydi@example.com')
  const mine = (await call('GET', '/opening', undefined, o8)).body.data.leases.find(l => l.leaseId === 'l3')
  assert.ok(mine.items.length && mine.items.every(it => it.ownerId === 'o8'))
  // pre-fill from the schedule: Nov 2025 – Mar 2026 for the co-owned lease, two rows a month
  r = await call('GET', '/leases/l3/opening-fill?from=2025-11'); assert.equal(r.status, 200)
  assert.equal(r.body.data.items.length, 10); assert.deepEqual(r.body.data.items[0], { period: '2025-11', type: 'Rent', ownerId: 'o3', amount: 40800, note: 'From rent schedule' }) // 60% of ₹85,000 less the ₹10,200 advance adjustment
  assert.equal((await call('GET', '/leases/l3/opening-fill?from=nov')).status, 400)
  // payment defaults: TDS at the owner's rate on the rent part of the amount
  const it = l3.items.find(x => x.ownerId === 'o3' && x.type === 'Rent')
  r = await call('GET', `/leases/l3/opening-pay/${it.id}`); assert.equal(r.status, 200)
  assert.equal(r.body.data.rate, 10); assert.equal(r.body.data.tds, Math.round(it.amount * 0.1)); assert.equal(r.body.data.paid, it.amount - r.body.data.tds)
  assert.equal((await call('GET', '/leases/l3/opening-pay/nope')).status, 404)
})

test('ledgers, rent roll and rent status are computed by the server', async () => {
  // Rent ledger for TrustLab's whole scope, current FY — the figures the Owner ledgers page shows
  let r = await call('GET', '/ledgers?tab=Rent&fy=26-27')
  assert.equal(r.status, 200, r.body.message); assertEnvelope(r)
  let d = r.body.data
  assert.deepEqual([d.opening, d.totals.dr, d.totals.cr - d.totals.tds, d.totals.tds, d.totals.closing], [693950, 5283760, 4192940, 326380, 1458390])
  assert.ok(d.rows.length && d.rows.every(x => x.d >= '2026-04-01')); assert.ok(d.recon.rows.length); assert.ok(d.fys.includes('26-27'))
  // one property, one co-owner
  d = (await call('GET', '/ledgers?tab=Rent&fy=26-27&propertyId=p3&ownerId=o8')).body.data
  assert.deepEqual([d.opening, d.totals.dr, d.totals.closing, d.ownerId], [71400, 214200, 71400, 'o8'])
  assert.ok((await call('GET', '/ledgers?tab=Other&fy=all')).body.data.deposits.length)
  assert.equal((await call('GET', '/ledgers?tab=Rent&fy=2026')).status, 400)
  assert.equal((await call('GET', '/ledgers?propertyId=nope')).status, 400)
  const csv = await fetch(base + '/ledgers.csv?tab=Rent', { headers: { Authorization: 'Bearer ' + token } })
  assert.equal(csv.status, 200); assert.ok((await csv.text()).startsWith('"Date","Particulars"'))
  // an owner gets their own rows only, whatever ownerId they pass
  const { accessToken: o1 } = await tokenFor('sr.kondapalli@example.com')
  d = (await call('GET', '/ledgers?tab=Rent&fy=26-27&ownerId=o3', undefined, o1)).body.data
  assert.deepEqual([d.ownerId, d.opening, d.totals.dr, d.totals.tds, d.totals.closing], ['o1', 0, 2605440, 184000, 434240])
  // rent roll: 7 months around today, cells per lease, no drafts
  r = await call('GET', '/rent-roll?months=7'); d = r.body.data
  assert.equal(d.periods.length, 7); assert.equal(d.periods[5], d.cur); assert.ok(!d.leases.some(l => l.leaseId === 'l6'), 'draft lease excluded')
  const l1 = d.leases.find(l => l.leaseId === 'l1'); assert.ok(l1); assert.ok(['paid', 'late', 'process', 'missing', 'upcoming', 'free', 'na'].includes(l1.cells[d.cur].k)); assert.equal(l1.rentNow, 368000)
  const l3 = (await call('GET', '/rent-roll', undefined, (await tokenFor('sravani.pydi@example.com')).accessToken)).body.data.leases.find(l => l.leaseId === 'l3')
  assert.equal(l3.rentNow, 35700, 'co-owner sees their share'); assert.equal(l3.cells[d.cur].multi, false)
  // rent status per property
  d = (await call('GET', '/rent-status')).body.data
  assert.equal(d.byProperty.p1.v, 'Overdue'); assert.match(d.byProperty.p1.note, /₹3,97,440 · 1 month unpaid/); assert.equal(d.byProperty.p6.v, '—')
})

test('rent schedule is computed by the server and scoped like the lease', async () => {
  const r = await call('GET', '/leases/l3/schedule')
  assert.equal(r.status, 200, r.body.message); assertEnvelope(r)
  const sc = r.body.data
  assert.equal(sc.leaseId, 'l3'); assert.equal(sc.tot.months, 60)
  assert.deepEqual([sc.tot.rent, sc.tot.maint, sc.tot.rcm, sc.tot.tds, sc.tot.net], [5519516, 360000, 1027713, 320971, 5388545])
  assert.deepEqual(sc.owners.map(o => [o.ownerId, o.rent, o.deposit]), [['o3', 3311710, 306000], ['o8', 2207806, 204000]])
  assert.equal(sc.rows[0].notes[0], 'Rent-free'); assert.equal(sc.upfront.advTds, 10200)
  assert.equal((await call('GET', '/leases/l5/schedule')).body.data.end, '2026-12-01', 'stops at the exit date')
  assert.equal((await call('GET', '/leases/nope/schedule')).status, 404)
  const csv = await fetch(base + '/leases/l1/schedule.csv', { headers: { Authorization: 'Bearer ' + token } })
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/); assert.ok((await csv.text()).startsWith('"Month","Lease year"'))
  const { accessToken: o8 } = await tokenFor('sravani.pydi@example.com')
  assert.equal((await call('GET', '/leases/l3/schedule', undefined, o8)).status, 200, 'co-owner sees the shared lease')
  assert.equal((await call('GET', '/leases/l1/schedule', undefined, o8)).status, 404, 'not another owner’s lease')
})

test('TDS report, return CSV and owner Form 16A are computed by the server', async () => {
  const r = await call('GET', '/tds/report?fy=26-27')
  assert.equal(r.status, 200, r.body.message); assertEnvelope(r)
  const R = r.body.data
  assert.equal(R.fy, '26-27'); assert.equal(R.ws, 'tdpl'); assert.equal(R.rows.length, 12); assert.equal(R.quarters.length, 4)
  assert.equal(R.rows.reduce((a, x) => a + x.ded, 0), 352030); assert.equal(R.rows.reduce((a, x) => a + x.dep, 0), 305505)
  const sep = R.rows.find(x => x.m === '2026-09'); assert.equal(sep.st, 'Overdue'); assert.equal(sep.bal, 46525)
  assert.equal(R.quarters[0].st, 'Filed'); assert.equal(R.challans.length, 5); assert.ok(R.fys.includes('26-27'))
  assert.equal((await call('GET', '/tds/report?fy=2026')).status, 400)
  const csv = await fetch(base + '/tds/return.csv?fy=26-27&q=1', { headers: { Authorization: 'Bearer ' + token } })
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/); assert.ok((await csv.text()).startsWith('"Deductee PAN"'))
  const f16 = await call('GET', '/tds/owner/o1/f16')
  assert.equal(f16.status, 200); assert.ok(f16.body.data.quarters.length); assert.equal(f16.body.data.pan, 'ABCPK1234F')
  const { accessToken: o1 } = await tokenFor('sr.kondapalli@example.com')
  assert.equal((await call('GET', '/tds/report', undefined, o1)).status, 403)
  assert.equal((await call('GET', '/tds/owner/o1/f16', undefined, o1)).status, 200)
  assert.equal((await call('GET', '/tds/owner/o3/f16', undefined, o1)).status, 403)
  const { accessToken: fr } = await tokenFor('medpoint@example.com')
  const fx = await call('GET', '/tds/report?fy=26-27', undefined, fr)
  assert.equal(fx.status, 200); assert.equal(fx.body.data.ws, 'pa2'); assert.equal(fx.body.data.rows.reduce((a, x) => a + x.dep, 0), 0)
})

test('TDS records: challans and returns per workspace; owners only read their own Form 16A', async () => {
  assert.equal((await call('GET', '/tds?kind=challan')).body.pagination.total, 5)
  const challan = { kind: 'challan', month: '2026-09', amount: 5000, paidOn: '2026-10-06', bsr: '051030', challanNo: '12345', mode: 'Net banking (e-Pay Tax)' }
  const bad = await call('POST', '/tds', challan)
  assert.equal(bad.status, 400); assert.equal(bad.body.message, 'BSR code should be 7 digits.')
  const made = await call('POST', '/tds', { ...challan, bsr: '0510308' })
  assert.equal(made.status, 201); assert.equal(made.body.data.ws, 'tdpl'); assert.equal(made.body.message, 'TDS record “TDS challan 0510308/12345” created.')
  const dup = await call('POST', '/tds', { kind: 'return', fy: '26-27', q: 1 })
  assert.equal(dup.status, 409)

  const { accessToken: o1 } = await tokenFor('sr.kondapalli@example.com')
  const mine = await call('GET', '/tds', undefined, o1)
  assert.ok(mine.body.data.length && mine.body.data.every(r => r.kind === 'return' && Object.keys(r.f16a).join() === 'o1'))
  const ro = await call('POST', '/tds', { ...challan, bsr: '0510308', challanNo: '54321' }, o1)
  assert.equal(ro.status, 403); assert.equal(ro.body.message, 'Property owners can view TDS records but can’t change them.')

  const { accessToken: fr } = await tokenFor('medpoint@example.com')
  assert.equal((await call('GET', '/tds', undefined, fr)).body.pagination.total, 0)
  assert.equal((await call('POST', '/tds', { ...challan, bsr: '0510308', ws: 'tdpl' }, fr)).status, 403)
  assert.equal((await call('POST', '/tds', { ...challan, bsr: '0510308', ws: 'pa2' }, fr)).status, 201)
  assert.equal((await call('GET', '/tds?ws=pa2')).body.pagination.total, 0) // TrustLab does not see a partner's TDS
})
