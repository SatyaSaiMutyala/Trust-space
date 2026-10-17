/* TDS register and returns against the sample portfolio, as on 2026-10-16 (goldens read off the TDS page). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeCtx, clearSchedCache } from '../lease.js'
import { tdsEntries, tdsMonthRows, tdsQuarters, tdsDue, quarterOf, qDue, monthsLate, RET_DUE, tdsQcsv } from '../tds.js'

const D = JSON.parse(readFileSync(new URL('../../../backend/src/seed/sample-data.json', import.meta.url)))
const TODAY = '2026-10-16'
const docs = D.tds || []
const ctx = () => ({ ...makeCtx({ today: TODAY, owners: D.owners, props: D.properties, invoices: D.invoices }), leases: D.leases, tdsDocs: kind => docs.filter(x => x.kind === kind && (x.ws || 'tdpl') === 'tdpl') })

test('due dates and quarters', () => {
  assert.equal(tdsDue('2026-09'), '2026-10-07'); assert.equal(tdsDue('2027-03'), '2027-04-30')
  assert.deepEqual(['2026-04', '2026-07', '2026-10', '2027-01'].map(quarterOf), [1, 2, 3, 4])
  assert.equal(qDue('26-27', 2, RET_DUE), '2026-10-31'); assert.equal(qDue('26-27', 4, RET_DUE), '2027-05-31')
  assert.equal(monthsLate('2026-10-07', '2026-10-05'), 0); assert.equal(monthsLate('2026-10-07', '2026-10-08'), 1); assert.equal(monthsLate('2026-10-07', '2026-12-20'), 3)
})

test('FY 26-27 register matches the TDS page: deducted, deposited, the overdue month', () => {
  clearSchedCache()
  const rows = tdsMonthRows('26-27', ctx())
  const fyRows = rows.filter(r => r.m <= '2026-10')
  assert.equal(tdsEntries(ctx()).filter(e => e.month >= '2026-04' && e.month <= '2027-03').length, 22)
  assert.equal(rows.reduce((a, r) => a + r.ded, 0), 352030)
  assert.equal(rows.reduce((a, r) => a + r.dep, 0), 305505)
  assert.equal(rows.reduce((a, r) => a + r.cs.length, 0), 5)
  const sep = rows.find(r => r.m === '2026-09'); assert.equal(sep.st, 'Overdue'); assert.equal(sep.bal, 46525)
  assert.equal(rows.find(r => r.m === '2026-04').st, 'Deposited')
  assert.ok(fyRows.length)
})

test('quarterly returns: Q1 filed, Q2 due by 31 Oct, Form 16A count', () => {
  const qs = tdsQuarters('26-27', ctx())
  assert.equal(qs[0].st, 'Filed'); assert.equal(qs[1].st, 'Due'); assert.equal(qs[1].due, '2026-10-31')
  assert.equal(qs.filter(q => q.st === 'Filed').length, 1)
  assert.equal(qs.reduce((a, q) => a + q.issued, 0), 2); assert.equal(qs.reduce((a, q) => a + q.owners.length, 0), 6)
  const csv = tdsQcsv('26-27', 1, ctx()); assert.ok(csv.startsWith('"Deductee PAN"')); assert.ok(csv.split('\n').length > 1)
})
