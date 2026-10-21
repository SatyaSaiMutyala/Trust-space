/* Lease maths against the sample portfolio (backend/src/seed/sample-data.json). The golden totals were read off the
   web app before the maths moved here, so a change in any of them is a change in behaviour.
   Run: node --test shared/calc/test/ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeCtx, schedule, calc, splitAmt, escAmt, escSteps, tdsRateOf, leaseState, rentCell, depHeld, clearSchedCache, rentFor, allLeaseOwners, depositOwners, leaseOwners, isMulti } from '../lease.js'

const D = JSON.parse(readFileSync(new URL('../../../backend/src/seed/sample-data.json', import.meta.url)))
const TODAY = '2026-10-16'
const ctx = () => makeCtx({ today: TODAY, owners: D.owners, props: D.properties, invoices: D.invoices })
const lease = id => D.leases.find(l => l.id === id)

test('schedule totals — single owner, forward GST, compounded escalation (l1)', () => {
  clearSchedCache()
  const sc = schedule(lease('l1'), ctx())
  assert.deepEqual([sc.tot.rent, sc.tot.maint, sc.tot.gst, sc.tot.tds, sc.tot.net], [39053867, 4750380, 7884768, 4215763, 47473252])
  assert.equal(sc.tot.months, 108)
})

test('schedule totals — two co-owners under RCM, simple escalation, advance rent (l3)', () => {
  const sc = schedule(lease('l3'), ctx())
  assert.deepEqual([sc.tot.rent, sc.tot.maint, sc.tot.rcm, sc.tot.tds, sc.tot.net], [5519516, 360000, 1027713, 320971, 5388545])
  assert.equal(sc.tot.adj, 170000, 'advance rent fully adjusted')
  assert.deepEqual([sc.upfront.adv, sc.upfront.advTds], [170000, 10200])
  // the Lease tab's tiles: "TDS deducted" = monthly TDS + TDS on the advance; "Net paid to owner" = monthly net + advance − its TDS
  assert.equal(sc.tot.tds + sc.upfront.advTds, 331171); assert.equal(sc.tot.net + sc.upfront.adv - sc.upfront.advTds, 5548345)
  assert.equal(sc.rows[0].notes[0], 'Rent-free')
  const owners = sc.owners.map(o => [o.ownerId, o.rent, o.deposit, o.adv])
  assert.deepEqual(owners, [['o3', 3311710, 306000, 102000], ['o8', 2207806, 204000, 68000]])
  assert.equal(sc.owners[1].tdsOn, false, '40% share is below the ₹50,000 threshold')
})

test('schedule stops at the exit date once notice is served (l5)', () => {
  const sc = schedule(lease('l5'), ctx())
  assert.equal(sc.end, '2026-12-01')
  assert.deepEqual([sc.tot.rent, sc.tot.maint, sc.tot.rcm, sc.tot.tds, sc.tot.net], [1904462, 117581, 363964, 0, 2022043])
  assert.equal(sc.rows[0].notes[0], 'Rent from 16 Jan 2023 · 16/31 days')
})

test('escalation: compounded vs simple, counted from lease start', () => {
  const L = { start: '2023-01-01', end: '2027-12-31', rent: 100000, escPct: 10, escEvery: 12, escType: 'Compound', escFrom: 'Lease start' }
  assert.equal(escSteps(L, '2023-12-31'), 0); assert.equal(escSteps(L, '2024-01-01'), 1); assert.equal(escSteps(L, '2026-06-15'), 3)
  assert.equal(escAmt(L, 100000, '2026-06-15'), 133100)
  assert.equal(escAmt({ ...L, escType: 'Simple' }, 100000, '2026-06-15'), 130000)
  assert.equal(rentFor(L, '2022-06'), 100000, 'before the start the base rent applies')
})

test('splitAmt: whole rupees, the last sharing owner absorbs rounding', () => {
  const os = [{ ownerId: 'a', rent: 33.33 }, { ownerId: 'b', rent: 33.33 }, { ownerId: 'c', rent: 33.34 }]
  const parts = splitAmt(100000, os, 'rent')
  assert.deepEqual(parts, [33330, 33330, 33340]); assert.equal(parts.reduce((a, b) => a + b, 0), 100000)
  assert.deepEqual(splitAmt(1000, [{ rent: 100 }, { rent: 0 }], 'rent'), [1000, 0])
})

test('TDS rate: 10% with a valid PAN, 20% without or inoperative, certificate rate inside its window', () => {
  assert.equal(tdsRateOf({ pan: 'ABCPK1234F' }, '2026-10-01'), 10)
  assert.equal(tdsRateOf({ pan: '' }, '2026-10-01'), 20)
  assert.equal(tdsRateOf({ pan: 'ABCPK1234F', panStatus: 'Inoperative' }, '2026-10-01'), 20)
  const O = { pan: 'ABCPK1234F', tdsCert: { rate: 2, from: '2026-11-01', to: '2027-03-31' } }
  assert.equal(tdsRateOf(O, '2026-10-16'), 10); assert.equal(tdsRateOf(O, '2026-12-01'), 2)
  assert.equal(tdsRateOf(undefined, '2026-10-01'), 10)
})

test('invoice calc: GST and TDS on a rent invoice, 20% when the owner has no valid PAN', () => {
  const L = lease('l2'); const c = calc(L, 'Rent', 231525, '2026-10', undefined, 'o2', ctx())
  assert.deepEqual([c.gst, c.tds, c.total, c.net, c.tdsRate], [41675, 23153, 273200, 250047, 10])
  const noPan = makeCtx({ today: TODAY, owners: D.owners.map(o => o.id === 'o2' ? { ...o, pan: '' } : o), invoices: D.invoices })
  const c2 = calc(L, 'Rent', 231525, '2026-10', undefined, 'o2', noPan)
  assert.deepEqual([c2.tds, c2.tdsRate, c2.net], [46305, 20, 226895])
  assert.equal(calc(L, 'Electricity', 10000, '2026-10', undefined, 'o2', ctx()).gst, 0, 'no GST on electricity')
})

test('leaseState depends on today', () => {
  const L = lease('l4') // ends 2026-12-28
  assert.equal(leaseState(L, '2026-10-16'), 'Renewal due'); assert.equal(leaseState(L, '2026-01-01'), 'Active'); assert.equal(leaseState(L, '2027-01-01'), 'Expired')
  assert.equal(leaseState(lease('l5'), TODAY), 'Notice period'); assert.equal(leaseState(lease('l6'), TODAY), 'Draft'); assert.equal(leaseState(null, TODAY), 'No lease')
})

test('rent roll cell: paid / missing / upcoming, and an owner sees only their own share', () => {
  const L = lease('l3'); const c = ctx()
  assert.equal(rentCell(L, '2024-01', c).k, 'na')
  assert.ok(['paid', 'late', 'process', 'missing'].includes(rentCell(L, '2026-09', c).k))
  assert.equal(rentCell(L, '2027-06', c).k, 'upcoming')
  const mine = rentCell(L, '2026-10', makeCtx({ ...c, me: 'o8' }))
  assert.equal(mine.n, 1); assert.equal(mine.multi, false)
})

test('deposit held after agreed adjustments (l5)', () => {
  const L = lease('l5'); const agreed = (L.depAdj || []).filter(a => a.status === 'Agreed').reduce((a, x) => a + +x.amount, 0)
  assert.equal(depHeld(L), +L.deposit - agreed)
})

test('co-owner changes: the split in force each month comes from ownerHistory; deposit stays with the signing owners (l3)', () => {
  const L = { ...lease('l3'), ownerHistory: [{ until: '2026-06', owners: lease('l3').owners }], owners: [{ ownerId: 'o3', rent: 100, maint: 100, dep: 100, adv: 100, gst: 'RCM' }], ownerId: 'o3' }
  clearSchedCache()
  const sc = schedule(L, ctx())
  const before = sc.rows.find(r => r.p === '2026-06'), after = sc.rows.find(r => r.p === '2026-07')
  assert.deepEqual(before.split.map(x => x.ownerId), ['o3', 'o8'])
  assert.deepEqual(after.split.map(x => x.ownerId), ['o3'])
  assert.equal(after.split[0].rent, after.rent)
  const o8 = sc.owners.find(o => o.ownerId === 'o8')
  assert.equal(o8.active, false); assert.equal(o8.until, '2026-06'); assert.ok(o8.rent > 0)
  assert.equal(o8.deposit, Math.round(L.deposit * 0.4)) // deposit as at signing
  assert.deepEqual(allLeaseOwners(L).map(o => [o.ownerId, o.active]), [['o3', true], ['o8', false]])
  assert.equal(depositOwners(L).length, 2); assert.equal(leaseOwners(L).length, 1); assert.equal(isMulti(L), true)
  clearSchedCache()
})

test('co-share: paid their rent share with TDS, no GST, no deposit by default, not a party to the agreement', async () => {
  const { isCoShare, leaseParties, leaseCoShares, ownerGstMode } = await import('../lease.js')
  const L = { ...lease('l1'), id: 'l1x', gstMode: 'Forward', owners: [{ ownerId: 'o1', rent: 80, maint: 80, dep: 100, adv: 100, gst: '' }, { ownerId: 'o2', rent: 20, maint: 20, dep: 0, adv: 0, gst: 'Forward', role: 'coShare' }] }
  assert.deepEqual(leaseParties(L).map(o => o.ownerId), ['o1']); assert.deepEqual(leaseCoShares(L).map(o => o.ownerId), ['o2'])
  assert.equal(ownerGstMode(L, 'o1', '2026-10'), 'Forward'); assert.equal(ownerGstMode(L, 'o2', '2026-10'), 'None', 'a co-share never has GST, whatever the row says')
  const row = schedule(L, ctx()).rows.find(r => r.p === '2026-10'); const cs = row.split.find(s => s.ownerId === 'o2'); const ow = row.split.find(s => s.ownerId === 'o1')
  assert.equal(cs.role, 'coShare'); assert.equal(ow.role, 'owner')
  assert.equal(cs.rent, Math.round(row.rent * 0.2)); assert.equal(cs.gst, 0); assert.equal(cs.rcm, 0); assert.ok(cs.tds > 0, 'TDS on the co-share’s own PAN'); assert.equal(cs.mode, 'None')
  assert.ok(ow.gst > 0, 'the owner keeps forward GST on their share')
  assert.equal(depositOwners(L).find(o => o.ownerId === 'o2').dep, 0)
  assert.equal(allLeaseOwners(L).find(x => x.ownerId === 'o2').role, 'coShare')
  assert.equal(calc(L, 'Rent', 10000, '2026-10', undefined, 'o2', ctx()).gst, 0)
  assert.ok(isCoShare({ role: 'coShare' }) && !isCoShare({}) && !isCoShare(null))
})

test('extension with a revised rent: old rent to the old end, the new base from the extension, escalations counted from there', async () => {
  const { rentAt, rentBaseAt, nextEsc: ne } = await import('../lease.js')
  const L0 = lease('l1') // Apr 2023 – Mar 2032, 3,20,000, 15% every 36 months compound
  const L = { ...L0, id: 'l1ext', end: '2035-03-31', extensions: [{ id: 'x1', at: '2032-01-10T00:00:00Z', by: 'Ravi', fromEnd: '2032-03-31', toEnd: '2035-03-31', rent: 380000, rentFrom: '2032-04-01', ref: 'Addendum 1' }] }
  assert.equal(rentFor(L, '2032-03'), rentFor(L0, '2032-03'), 'unchanged before the extension')
  assert.equal(rentFor(L, '2032-04'), 380000, 'the revised rent from the extension')
  assert.equal(rentFor(L, '2035-03'), 380000, 'no escalation yet: 36 months from Apr 2032 is Apr 2035')
  assert.deepEqual(rentBaseAt(L, '2033-01-01'), { base: 380000, anchor: '2032-04-01', step: L.extensions[0] })
  assert.equal(ne(L, '2031-12-01'), '2032-04-01', 'the next rent change is the extension step, before the next escalation')
  const S = schedule(L, ctx()); assert.equal(S.rows.find(r => r.p === '2032-04').rent, 380000); assert.equal(S.rows[S.rows.length - 1].p, '2035-03')
  const noRent = { ...L, id: 'l1ext2', extensions: [{ ...L.extensions[0], rent: null }] }
  assert.equal(rentFor(noRent, '2032-04'), rentFor(L0, '2032-04'), 'without a revised rent the existing schedule simply continues')
})

test('escalation by a fixed amount: ₹3,000 more per month every 12 months', () => {
  const L = { id: 'amt', start: '2026-04-01', end: '2031-03-31', rent: 20000, escType: 'Amount', escAdd: 3000, escEvery: 12, escPct: 0, fitout: 0, payTiming: 'Advance', dueDay: 5, gstMode: 'None', tds: false, maintType: 'None', ownerId: 'o1' }
  assert.equal(rentFor(L, '2026-04'), 20000); assert.equal(rentFor(L, '2027-03'), 20000)
  assert.equal(rentFor(L, '2027-04'), 23000); assert.equal(rentFor(L, '2028-04'), 26000); assert.equal(rentFor(L, '2031-03'), 32000)
  const S = schedule(L, ctx()); assert.equal(S.rows.find(r => r.p === '2029-06').rent, 29000)
  assert.equal(rentFor({ ...L, escAdd: 0 }, '2028-04'), 20000, 'no amount = no escalation')
})
