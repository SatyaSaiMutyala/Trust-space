/*
 * Rules that need more than the field checks in config.js — nested lists (co-owners, deposit adjustments, opening
 * balances), cross-record links and TDS records. Each check(rec, { models }) returns { field: message } for every
 * problem found (empty = valid). It runs on create, replace and patch, after the simple field checks.
 */

const PERIOD = /^\d{4}-\d{2}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const isNum = v => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v))
const n = v => Number(v) || 0
const inr = v => '₹' + Math.round(n(v)).toLocaleString('en-IN')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const perLabel = p => `${MONTHS[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`
const SHARES = [['rent', 'Rent'], ['maint', 'Maintenance'], ['dep', 'Deposit'], ['adv', 'Advance']]
export const INV_TYPES = ['Rent', 'Electricity', 'Maintenance', 'Water', 'Other']
export const DEP_ADJ_STATUS = ['Proposed', 'Agreed', 'Declined', 'Cancelled']

/** Owners of a lease with their % shares; a lease without co-owners has its one owner at 100%. */
export const leaseOwnersOf = L => (Array.isArray(L?.owners) && L.owners.length ? L.owners : L?.ownerId ? [{ ownerId: L.ownerId, rent: 100, maint: 100, dep: 100, adv: 100 }] : [])

/** Split an amount by share %, giving any rounding difference to the last owner with a share (same as the web app). */
export function splitAmt(total, owners, k) {
  const parts = owners.map(o => Math.round(total * n(o[k]) / 100))
  const last = owners.map((o, i) => (n(o[k]) > 0 ? i : -1)).filter(i => i >= 0).pop()
  if (last !== undefined) parts[last] += total - parts.reduce((a, b) => a + b, 0)
  return parts
}

async function ownerNames(models, ids) {
  const rows = await models.owners.find({ _id: { $in: ids } }, { name: 1 }).lean()
  return Object.fromEntries(rows.map(o => [o._id, o.name]))
}
/** ids of the owners whose record says Co-share (the split row's role is set from this on save, see derive.js). */
async function coShareIds(models, ids) {
  const rows = await models.owners.find({ _id: { $in: ids }, party: 'Co-share' }, { _id: 1 }).lean()
  return new Set(rows.map(o => o._id))
}

/* ---------- properties: co-owners with their share of the rent ---------- */
/** `owners` = [{ ownerId, share }] (%). The first owner is the main contact and is mirrored into `ownerId`; shares must total 100. */
async function checkProperty(P, { models }) {
  if (P.owners === undefined || P.owners === null) return {}
  if (!Array.isArray(P.owners)) return { owners: 'Owners must be a list' }
  if (!P.owners.length) return {}
  const ids = P.owners.map(o => o && o.ownerId)
  if (ids.some(id => !id)) return { owners: 'Every co-owner row needs an owner' }
  if (new Set(ids).size !== ids.length) return { owners: 'The same owner is listed twice' }
  const found = await models.owners.countDocuments({ _id: { $in: ids } })
  if (found !== ids.length) return { owners: 'A co-owner does not exist' }
  if (P.owners.length > 1) {
    if (P.owners.some(o => !isNum(o.share) || n(o.share) < 0)) return { owners: 'Each co-owner needs a share of the rent (%)' }
    const total = P.owners.reduce((a, o) => a + n(o.share), 0)
    if (Math.round(total) !== 100) return { owners: `The owners’ shares add up to ${Math.round(total)}%. They must total 100%` }
  }
  if (P.ownerId && P.ownerId !== ids[0]) return { ownerId: 'The main owner must be the first co-owner' }
  return {}
}

/* ---------- leases: co-owners, deposit adjustments, opening balances ---------- */
async function checkLease(L, { models }) {
  const errors = {}
  const owners = leaseOwnersOf(L)
  const ids = owners.map(o => o.ownerId)
  const names = await ownerNames(models, ids.filter(Boolean))
  const who = id => names[id] || id
  const everOwner = id => (Array.isArray(L.ownerHistory) ? L.ownerHistory : []).some(h => (h?.owners || []).some(o => o.ownerId === id)) // former co-owners keep their past records

  if (L.owners !== undefined && L.owners !== null) {
    if (!Array.isArray(L.owners)) errors.owners = 'Co-owners must be a list of { ownerId, rent, maint, dep, adv, gst }'
    else if (L.owners.length) {
      const problems = []
      if (ids.some(id => !id)) problems.push('choose an owner on every co-owner row')
      if (new Set(ids).size !== ids.length) problems.push('the same owner is listed twice')
      const missing = ids.filter(id => id && !names[id])
      if (missing.length) problems.push(`owner “${missing[0]}” does not exist`)
      for (const o of L.owners) {
        if (o.role && !['owner', 'coShare'].includes(o.role)) problems.push(`role for ${who(o.ownerId)} must be owner or coShare`)
        if (o.gst && !['Forward', 'RCM', 'None'].includes(o.gst)) problems.push(`GST status for ${who(o.ownerId)} must be Forward, RCM or None`)
        for (const [k, label] of SHARES) if (o[k] !== undefined && o[k] !== '' && (!isNum(o[k]) || n(o[k]) < 0 || n(o[k]) > 100)) problems.push(`${label} share for ${who(o.ownerId)} must be between 0 and 100`)
      }
      const cs = await coShareIds(models, ids.filter(Boolean))
      if (L.owners.length && L.owners.every(o => o.role === 'coShare' || cs.has(o.ownerId))) problems.push('at least one owner on the agreement is needed — co-shares cannot be the only payees')
      if (L.owners.length > 1) {
        const needed = { rent: true, maint: n(L.maint) > 0, dep: n(L.deposit) > 0, adv: n(L.advanceRent) > 0 }
        for (const [k, label] of SHARES) {
          const t = L.owners.reduce((a, o) => a + n(o[k]), 0)
          if (needed[k] && Math.abs(t - 100) > 0.01) problems.push(`${label} shares add up to ${Math.round(t * 100) / 100}% — they must total 100%`)
        }
      }
      if (problems.length) errors.owners = problems[0].charAt(0).toUpperCase() + problems[0].slice(1)
    }
  }

  if (L.ownerHistory !== undefined && L.ownerHistory !== null) {
    if (!Array.isArray(L.ownerHistory)) errors.ownerHistory = 'Owner history must be a list of { until, owners }'
    else {
      const hid = [...new Set(L.ownerHistory.flatMap(h => (Array.isArray(h?.owners) ? h.owners.map(o => o.ownerId) : [])))]
      const hn = await ownerNames(models, hid.filter(Boolean))
      for (const h of L.ownerHistory) {
        if (!h || !PERIOD.test(h.until || '')) { errors.ownerHistory = 'Each owner history entry needs the last month it applied, like 2026-09'; break }
        if (!Array.isArray(h.owners) || !h.owners.length) { errors.ownerHistory = `Owner history up to ${perLabel(h.until)} needs at least one owner`; break }
        if (h.owners.some(o => !o.ownerId || !hn[o.ownerId])) { errors.ownerHistory = `Owner history up to ${perLabel(h.until)} lists an owner that does not exist`; break }
        const t = h.owners.reduce((a, o) => a + n(o.rent), 0)
        if (h.owners.length > 1 && Math.abs(t - 100) > 0.01) { errors.ownerHistory = `Rent shares up to ${perLabel(h.until)} add up to ${Math.round(t * 100) / 100}% — they must total 100%`; break }
      }
    }
  }
  if (L.ownerChanges !== undefined && L.ownerChanges !== null && !Array.isArray(L.ownerChanges)) errors.ownerChanges = 'Owner changes must be a list'

  if (L.rentSteps !== undefined && L.rentSteps !== null) {
    if (!Array.isArray(L.rentSteps)) errors.rentSteps = 'Rent changes must be a list'
    else {
      const seen = new Set()
      for (const s of L.rentSteps) {
        if (!s || typeof s !== 'object' || !DATE.test(s.from || '')) { errors.rentSteps = 'Each rent change needs the date it applies from'; break }
        if (L.start && s.from <= L.start) { errors.rentSteps = `A rent change (${s.from}) must be after the lease start`; break }
        if (L.end && s.from > L.end) { errors.rentSteps = `A rent change (${s.from}) is after the lease end`; break }
        if (!['pct', 'amt', 'rent'].includes(s.kind)) { errors.rentSteps = 'Each rent change must be a % increase, a ₹ increase or a new rent'; break }
        if (!isNum(s.value) || n(s.value) <= 0) { errors.rentSteps = `The rent change on ${s.from} needs a value above 0`; break }
        if (seen.has(s.from)) { errors.rentSteps = `Two rent changes on ${s.from}`; break }
        seen.add(s.from)
      }
    }
  }

  if (L.extensions !== undefined && L.extensions !== null) {
    if (!Array.isArray(L.extensions)) errors.extensions = 'Extensions must be a list'
    else {
      for (const e of L.extensions) {
        if (!e || typeof e !== 'object' || !DATE.test(e.fromEnd || '') || !DATE.test(e.toEnd || '')) { errors.extensions = 'Each extension needs the old and the new end date'; break }
        if (e.toEnd <= e.fromEnd) { errors.extensions = `An extension must end after the old end date (${e.fromEnd})`; break }
        if (e.rent !== undefined && e.rent !== null && e.rent !== '' && (!isNum(e.rent) || n(e.rent) < 0)) { errors.extensions = 'The revised rent of an extension must be ₹0 or more'; break }
        if (e.rentFrom !== undefined && e.rentFrom !== null && e.rentFrom !== '' && !DATE.test(e.rentFrom)) { errors.extensions = 'The date the revised rent applies from must be a date'; break }
      }
      const lastEnd = L.extensions.length ? L.extensions.map(e => e.toEnd).sort().pop() : null
      if (!errors.extensions && lastEnd && L.end && L.end < lastEnd) errors.end = `The lease end (${L.end}) is before its latest extension (${lastEnd})`
    }
  }

  if (L.depAdj !== undefined && L.depAdj !== null) {
    if (!Array.isArray(L.depAdj)) errors.depAdj = 'Deposit adjustments must be a list'
    else {
      let problem = null
      for (const a of L.depAdj) {
        if (!a || typeof a !== 'object') { problem = 'Each deposit adjustment must be an object'; break }
        if (!PERIOD.test(a.period || '')) { problem = 'Each deposit adjustment needs a rent month like 2026-10'; break }
        if (!ids.includes(a.ownerId) && !everOwner(a.ownerId)) { problem = `Deposit adjustment for ${perLabel(a.period)} is for someone who is not an owner on this lease`; break }
        if (!isNum(a.amount) || n(a.amount) < 0) { problem = `Deposit adjustment for ${perLabel(a.period)} needs an amount of ₹0 or more`; break }
        if (a.tds !== undefined && a.tds !== null && a.tds !== '' && (!isNum(a.tds) || n(a.tds) < 0)) { problem = `TDS on the ${perLabel(a.period)} deposit adjustment must be a number`; break }
        if (!DEP_ADJ_STATUS.includes(a.status)) { problem = `Deposit adjustment status must be one of: ${DEP_ADJ_STATUS.join(', ')}`; break }
      }
      if (!problem) {
        const live = L.depAdj.filter(a => a.status === 'Proposed' || a.status === 'Agreed')
        const seen = new Set()
        for (const a of live) { const key = a.period + '|' + a.ownerId; if (seen.has(key)) { problem = `${perLabel(a.period)} is adjusted against the deposit twice${owners.length > 1 ? ' for ' + who(a.ownerId) : ''}`; break } seen.add(key) }
        if (!problem) {
          const share = splitAmt(n(L.deposit), owners, 'dep')
          owners.forEach((o, i) => {
            const used = live.filter(a => a.ownerId === o.ownerId).reduce((s, a) => s + n(a.amount), 0)
            if (!problem && used > share[i] + 1) problem = `Deposit adjustments${owners.length > 1 ? ' for ' + who(o.ownerId) : ''} total ${inr(used)}, more than the security deposit of ${inr(share[i])}`
          })
        }
      }
      if (problem) errors.depAdj = problem
    }
  }

  if (L.opening !== undefined && L.opening !== null) {
    const ob = L.opening
    let problem = null
    if (typeof ob !== 'object' || Array.isArray(ob)) problem = 'Opening balance must be an object with asOf and items'
    else if (!DATE.test(ob.asOf || '')) problem = 'Opening balance needs an “as on” date like 2026-04-01'
    else if (!Array.isArray(ob.items)) problem = 'Opening balance items must be a list'
    else {
      const seen = new Set()
      for (const it of ob.items) {
        if (!PERIOD.test(it?.period || '')) { problem = 'Each opening-balance month needs a month like 2026-03'; break }
        const lab = `${it.type || 'Item'} for ${perLabel(it.period)}`
        if (it.period >= ob.asOf.slice(0, 7)) { problem = `${perLabel(it.period)} is on or after ${ob.asOf} — record it as an invoice instead`; break }
        if (!INV_TYPES.includes(it.type)) { problem = `Opening balance type must be one of: ${INV_TYPES.join(', ')}`; break }
        if (!ids.includes(it.ownerId) && !everOwner(it.ownerId)) { problem = `${lab} is for someone who is not an owner on this lease`; break }
        if (!isNum(it.amount) || n(it.amount) <= 0) { problem = `${lab} needs an amount due above ₹0`; break }
        for (const k of ['paidAmount', 'tds']) if (it[k] !== undefined && it[k] !== null && it[k] !== '' && (!isNum(it[k]) || n(it[k]) < 0)) problem = `${lab}: ${k === 'tds' ? 'TDS' : 'amount paid'} must be a number`
        if (problem) break
        if (n(it.paidAmount) + n(it.tds) > n(it.amount) + 1) { problem = `${lab}: paid ${inr(n(it.paidAmount) + n(it.tds))} including TDS is more than the ${inr(it.amount)} due`; break }
        if (n(it.paidAmount) && !DATE.test(it.paidOn || '')) { problem = `${lab}: enter the date it was paid`; break }
        const key = `${it.period}|${it.ownerId}|${it.type}`
        if (seen.has(key)) { problem = `${lab} is entered twice${owners.length > 1 ? ' for ' + who(it.ownerId) : ''}`; break }
        seen.add(key)
      }
    }
    if (problem) errors.opening = problem
  }
  return errors
}

/* ---------- invoices: the owner must be on the lease ---------- */
async function checkInvoice(i, { models }) {
  if (!i.leaseId || !i.ownerId) return {}
  const L = await models.leases.findById(i.leaseId, { ownerId: 1, owners: 1, ownerHistory: 1, ref: 1 }).lean()
  if (!L || leaseOwnersOf(L).some(o => o.ownerId === i.ownerId) || (L.ownerHistory || []).some(h => (h.owners || []).some(o => o.ownerId === i.ownerId))) return {}
  return { ownerId: `Owner “${i.ownerId}” is not an owner on lease ${L.ref}, so this invoice can’t be raised in their name` }
}

/* ---------- owners: lower / nil TDS certificate ---------- */
async function checkOwner(O) {
  const c = O.tdsCert
  if (!c || !c.type) return {}
  if (!['Lower', 'Nil'].includes(c.type)) return { tdsCert: 'Certificate type must be Lower or Nil' }
  if (!isNum(c.rate) || n(c.rate) < 0 || n(c.rate) > 10) return { tdsCert: 'Certificate TDS rate must be between 0% and 10%' }
  if (!DATE.test(c.from || '') || !DATE.test(c.to || '')) return { tdsCert: 'Enter the certificate’s valid-from and valid-to dates' }
  if (c.from > c.to) return { tdsCert: 'The certificate’s valid-to date is before its valid-from date' }
  if (c.limit !== undefined && c.limit !== null && c.limit !== '' && (!isNum(c.limit) || n(c.limit) < 0)) return { tdsCert: 'Certificate amount limit must be a number' }
  return {}
}

/* ---------- TDS challans and quarterly returns ---------- */
async function checkTds(t, { models }) {
  if (!t.ws) t.ws = 'tdpl' // TrustLab's own TDS unless a franchise partner's workspace is given
  if (t.kind === 'challan') {
    if (!PERIOD.test(t.month || '')) return { month: 'Enter the month the TDS was deducted, like 2026-09' }
    if (!isNum(t.amount) || n(t.amount) <= 0) return { amount: 'Enter the amount deposited' }
    if (!DATE.test(t.paidOn || '')) return { paidOn: 'Enter the date the challan was paid' }
    if (!/^\d{7}$/.test(t.bsr || '')) return { bsr: 'BSR code should be 7 digits' }
    if (!/^\d{5}$/.test(t.challanNo || '')) return { challanNo: 'Challan serial number should be 5 digits' }
    if (t.interest !== undefined && t.interest !== '' && (!isNum(t.interest) || n(t.interest) < 0)) return { interest: 'Interest must be a number' }
  }
  if (t.kind === 'return') {
    const m = /^(\d{2})-(\d{2})$/.exec(t.fy || '')
    if (!m || (+m[1] + 1) % 100 !== +m[2]) return { fy: 'Financial year should look like 26-27' }
    if (![1, 2, 3, 4].includes(Number(t.q))) return { q: 'Quarter must be 1, 2, 3 or 4' }
    t.q = Number(t.q)
    if (t.filedOn && !DATE.test(t.filedOn)) return { filedOn: 'Filing date should look like 2026-07-24' }
    if (t.filedOn && !/^\d{15}$/.test(t.ack || '')) return { ack: 'Token / acknowledgement number should be 15 digits' }
    if (t.f16a !== undefined && t.f16a !== null) {
      if (typeof t.f16a !== 'object' || Array.isArray(t.f16a)) return { f16a: 'Form 16A must be an object keyed by owner id' }
      const ids = Object.keys(t.f16a)
      const found = await models.owners.countDocuments({ _id: { $in: ids } })
      if (found !== ids.length) return { f16a: 'Form 16A lists an owner that does not exist' }
      if (Object.values(t.f16a).some(x => x?.issuedOn && !DATE.test(x.issuedOn))) return { f16a: 'Form 16A issue dates should look like 2026-08-10' }
    }
  }
  return {}
}

export const CHECKS = { properties: checkProperty, leases: checkLease, invoices: checkInvoice, owners: checkOwner, tds: checkTds }
