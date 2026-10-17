/* TDS register, challans, quarterly returns and Form 16A for the web app. The maths is in shared/calc/tds.js; this binds
   it to the store (workspace, today, who is looking) and adds the "needs attention" items. */
import * as T from '@calc/tds.js'
import { S, isOwner, isFranchisee, role } from '../store/store'
import { TODAY, perLabel, fmtD, inr, fy, daysTo } from './utils'
import { leaseOwners, leaseState, panValid, calcCtx } from './lease'

export const { TDS_SEC, fyMonths, tdsDue, quarterOf, RET_DUE, F16_DUE, qDue, monthsLate, daysBetween, fmtCinDate, TST } = T
/** TDS workspace: TrustLab ('tdpl') or the franchise partner's own. */
export const tdsWs = () => isFranchisee() ? role().partnerId : 'tdpl'
export const tdsDocs = kind => S.tds.filter(x => x.kind === kind && (x.ws || 'tdpl') === tdsWs())
const tctx = () => ({ ...calcCtx(), leases: S.leases, tdsDocs })

/* The TDS page, its drawers and the owner's Form 16A panel read these from the API (GET /api/tds/report, /api/tds/owner/:id/f16);
   the browser-side versions remain only for the overview's "needs attention" list below. */
const tdsMonthRows = f => T.tdsMonthRows(f, tctx())
const tdsQuarters = f => T.tdsQuarters(f, tctx())

/** "Needs attention" items for TDS (overdue deposits, returns, Form 16A, PAN and certificates). Each `a` is a runAct descriptor. */
export function tdsAttention(items) {
  if (isOwner()) return; const f = fy(TODAY); const go = { act: 'go', r: 'tds' }
  tdsMonthRows(f).forEach(r => { if (r.st === 'Overdue') items.push({ k: 'bad', t: `TDS for ${perLabel(r.m)} not deposited — ${inr(r.bal)}`, s: `Was due ${fmtD(r.due)} · interest ${inr(r.late)} so far`, a: go }); else if (r.st === 'Due' && daysTo(r.due) <= 7) items.push({ k: 'warn', t: `Deposit TDS for ${perLabel(r.m)} — ${inr(r.bal)}`, s: `Due ${fmtD(r.due)}`, a: go }) })
  tdsQuarters(f).forEach(q => { if (q.st === 'Overdue') items.push({ k: 'bad', t: `TDS return Q${q.q} FY ${f} not filed`, s: `Was due ${fmtD(q.due)} · late fee ${inr(q.lateFee)}`, a: go }); else if (q.st === 'Due' && daysTo(q.due) <= 15) items.push({ k: 'warn', t: `File TDS return Q${q.q} by ${fmtD(q.due)}`, s: `${q.owners.length} owners · ${inr(q.ded)}`, a: go }); if (q.st === 'Filed' && q.issued < q.owners.length && TODAY > q.f16) items.push({ k: 'warn', t: `Form 16A Q${q.q} pending for ${q.owners.length - q.issued} owner(s)`, s: `Was due ${fmtD(q.f16)}`, a: go }) })
  S.owners.forEach(o => { if (!S.leases.some(L => L.tds && leaseOwners(L).some(x => x.ownerId === o.id) && leaseState(L) !== 'Terminated')) return; if (!panValid(o)) items.push({ k: 'bad', t: `${o.name}: no valid PAN — TDS at 20%`, s: 'Update PAN in owner details', a: { act: 'viewOwnerProfile', id: o.id } }); const c = o.tdsCert; if (c && c.to && daysTo(c.to) >= 0 && daysTo(c.to) <= 30) items.push({ k: 'warn', t: `${o.name}: lower-deduction certificate expires ${fmtD(c.to)}`, s: 'Standard 10% applies after expiry unless renewed', a: go }) })
}
