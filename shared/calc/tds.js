/*
 * TDS compliance maths — deductions register, challans vs deducted, due dates and interest, quarterly returns, Form 16A.
 * Pure: `ctx` is the lease ctx (see lease.js) plus:
 *   leases: [...]     — leases in the workspace
 *   tdsDocs: kind => [...]  — 'challan' / 'return' documents of the workspace (TrustLab or a franchise partner)
 */
import { perAdd, by, toCsv } from './util.js'
import { TDS_BASE, tdsRate, obItems, depAdjs, schedule } from './lease.js'

export const TDS_SEC = 'Rent — land & building (s.393 of the Income-tax Act 2025; formerly s.194-I(b))'
export const fyMonths = f => { const y = 2000 + +f.slice(0, 2); return Array.from({ length: 12 }, (_, i) => perAdd(y + '-04', i)) }
/** TDS for a month is due by the 7th of the next month (30 April for March). */
export const tdsDue = per => per.slice(5) === '03' ? per.slice(0, 4) + '-04-30' : perAdd(per, 1) + '-07'
export const quarterOf = per => { const m = +per.slice(5); return m >= 4 && m <= 6 ? 1 : m <= 9 && m >= 7 ? 2 : m >= 10 ? 3 : 4 }
export const RET_DUE = { 1: '07-31', 2: '10-31', 3: '01-31', 4: '05-31' }, F16_DUE = { 1: '08-15', 2: '11-15', 3: '02-15', 4: '06-15' }
export const qDue = (f, q, map) => (q === 3 || q === 4 ? 2001 + +f.slice(0, 2) : 2000 + +f.slice(0, 2)) + '-' + map[q]
export function monthsLate(due, paid) { if (!paid || paid <= due) return 0; const a = new Date(due + 'T00:00:00'), b = new Date(paid + 'T00:00:00'); let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() > a.getDate() || m === 0) m++; return Math.max(1, m) }
export function daysBetween(a, b) { return Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5)) }
export const fmtCinDate = d => d ? d.slice(8, 10) + d.slice(5, 7) + d.slice(0, 4) : ''
/** Status → chip kind */
export const TST = { Deposited: 'ok', 'Deposited late': 'warn', Due: 'warn', Overdue: 'bad', Nil: 'idle', 'Not due': 'idle', Filed: 'ok', 'Not filed': 'warn', Issued: 'ok' }

/** Every TDS deduction (paid invoices, opening-balance payments, rent settled from the deposit, advance rent), oldest first. */
export function tdsEntries(ctx) {
  const CUR = ctx.today.slice(0, 7)
  const e = []; const tag = o => Object.assign({ rate: o.base ? Math.round(o.tds / o.base * 1000) / 10 : TDS_BASE }, o)
  ctx.invoices.filter(i => i.status === 'Paid' && +i.tdsDeducted > 0).forEach(i => e.push(tag({ date: i.paidDate || i.date, ownerId: i.ownerId, propertyId: i.propertyId, base: +i.base || 0, tds: +i.tdsDeducted, src: `${i.type} invoice ${i.number}${i.paidBy === 'Deposit' ? ' (settled from deposit)' : ''}`, per: i.period })))
  ctx.leases.forEach(L => {
    obItems(L).forEach(it => { if (+it.tds > 0 && it.paidOn) e.push(tag({ date: it.paidOn, ownerId: it.ownerId, propertyId: L.propertyId, base: Math.round(+it.tds / (tdsRate(it.ownerId, it.paidOn, ctx) / 100)), tds: +it.tds, src: `Opening balance · ${it.type} ${perLabelOf(it.period)}`, per: it.period })) })
    depAdjs(L).forEach(a => { if (!(+a.tds > 0) || a.period > CUR) return; if (ctx.invoices.some(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && i.ownerId === a.ownerId && i.status !== 'Rejected')) return; e.push(tag({ date: a.period + '-01', ownerId: a.ownerId, propertyId: L.propertyId, base: Math.round(+a.tds / (tdsRate(a.ownerId, a.period + '-01', ctx) / 100)), tds: +a.tds, src: `Rent ${perLabelOf(a.period)} settled from deposit`, per: a.period })) })
    if (L.status !== 'Draft' && +L.advanceRent && L.start <= ctx.today) { (schedule(L, ctx).owners || []).forEach(o => { if (o.advTds) e.push(tag({ date: L.start, ownerId: o.ownerId, propertyId: L.propertyId, base: o.adv, tds: o.advTds, src: 'Advance rent at signing', per: L.start.slice(0, 7) })) }) }
  })
  e.forEach(x => { x.month = x.date.slice(0, 7) })
  return e.sort((a, b) => a.date.localeCompare(b.date))
}
const perLabelOf = p => { if (!p) return '—'; const [y, m] = p.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }

/** Month-by-month register for a financial year ('26-27'): deducted vs deposited, due date, status, interest. */
export function tdsMonthRows(f, ctx) {
  const CUR = ctx.today.slice(0, 7); const ent = tdsEntries(ctx); const ch = ctx.tdsDocs('challan')
  return fyMonths(f).map(m => {
    const es = ent.filter(x => x.month === m); const ded = es.reduce((a, x) => a + x.tds, 0); const cs = ch.filter(c => c.month === m); const dep = cs.reduce((a, c) => a + (+c.amount || 0), 0); const due = tdsDue(m)
    const lastPaid = cs.map(c => c.paidOn).sort().pop(); const bal = ded - dep
    const late = cs.reduce((a, c) => a + Math.round((+c.amount || 0) * 0.015 * monthsLate(due, c.paidOn)), 0) + (bal > 0 && ctx.today > due ? Math.round(bal * 0.015 * monthsLate(due, ctx.today)) : 0)
    const st = !ded && !dep ? 'Nil' : bal <= 0 ? (cs.some(c => c.paidOn > due) ? 'Deposited late' : 'Deposited') : m > CUR ? 'Not due' : ctx.today > due ? 'Overdue' : 'Due'
    return { m, es, ded, cs, dep, bal, due, st, late, lastPaid }
  })
}
/** Quarterly return status, deductees, late fee and Form 16A issued for a financial year. */
export function tdsQuarters(f, ctx) {
  const CUR = ctx.today.slice(0, 7); const rows = tdsMonthRows(f, ctx); const rets = ctx.tdsDocs('return')
  return [1, 2, 3, 4].map(q => {
    const ms = rows.filter(r => quarterOf(r.m) === q); const es = ms.flatMap(r => r.es); const owners = [...new Set(es.map(x => x.ownerId))]
    const ret = rets.find(r => r.fy === f && r.q === q); const due = qDue(f, q, RET_DUE), f16 = qDue(f, q, F16_DUE); const iss = (ret && ret.f16a) || {}
    const st = ret && ret.filedOn ? 'Filed' : !es.length && ctx.today < due ? 'Not due' : ctx.today > due ? 'Overdue' : ctx.today >= qDue(f, q, RET_DUE).slice(0, 8) + '01' || ms[ms.length - 1].m < CUR ? 'Due' : 'Not due'
    const lateFee = ret?.filedOn ? Math.min(es.reduce((a, x) => a + x.tds, 0), 200 * Math.max(0, daysBetween(due, ret.filedOn))) : ctx.today > due ? Math.min(es.reduce((a, x) => a + x.tds, 0), 200 * daysBetween(due, ctx.today)) : 0
    return { q, ms, es, owners, ret, due, f16, st, ded: es.reduce((a, x) => a + x.tds, 0), dep: ms.reduce((a, r) => a + r.dep, 0), issued: owners.filter(o => iss[o]?.issuedOn).length, iss, lateFee }
  })
}
/** Deductee-wise lines for the quarterly return utility (CSV). */
export function tdsQcsv(f, q, ctx) {
  const Q = tdsQuarters(f, ctx).find(x => x.q === q); const ch = ctx.tdsDocs('challan')
  const rows = [['Deductee PAN', 'Deductee name', 'Section', 'Date of payment / credit', 'Amount paid / credited', 'Rate %', 'TDS deducted', 'TDS deposited (challan)', 'BSR code', 'Challan date', 'Challan serial no.', 'Premises', 'Source']]
  Q.es.forEach(x => { const O = ctx.ownerOf(x.ownerId); const c = ch.filter(c2 => c2.month === x.month).sort(by('paidOn'))[0]; rows.push([O?.pan || 'PANNOTAVBL', O?.name || '', '194-I(b) / 393', x.date, x.base, x.rate, x.tds, x.tds, c?.bsr || '', c?.paidOn || '', c?.challanNo || '', ctx.propOf(x.propertyId)?.code || '', x.src]) })
  return toCsv(rows)
}
