/* Menu items, badge counts and route guard (the prototype's renderNav). */
import { S, UI, role, frFull, inScope, unread, frScope } from './store'
import { NAV_TDPL, NAV_OWNER, NAV_FR, NAV_FR_FULL } from '../domain/constants'
import { siteStage } from '../domain/site'

export function navItems() {
  const r = role()
  return r.kind === 'owner' ? NAV_OWNER : r.kind === 'franchisee' ? (frFull(r) ? NAV_FR_FULL : NAV_FR) : NAV_TDPL
}
/** Send the user to the first allowed page if the current one is not in their menu. */
export function normalizeRoute() {
  const r = role(); if (r.kind === 'none') return
  const items = navItems()
  if (!items.find(i => i[0] === UI.route) && UI.route !== 'property') UI.route = items[0][0]
}
export function navCounts() {
  const r = role(); const fs = frScope()
  return {
    tickets: S.tickets.filter(t => inScope(t) && !['Resolved', 'Closed'].includes(t.status)).length,
    messages: unread(),
    invoices: r.kind === 'owner' ? 0 : S.invoices.filter(i => ['Submitted', 'Verified', 'Approved'].includes(i.status)).length,
    exits: S.leases.filter(l => l.exit && l.exit.noticeDate && l.exit.stage < 5).length,
    sites: S.sites.filter(st => (!fs || fs.has(st.reqId)) && ['Scrutiny', 'Negotiation', 'Acceptance', 'Approved'].includes(siteStage(st))).length,
    inspections: S.inspections.filter(i => inScope(i) && (r.kind === 'owner' ? i.status === 'Awaiting owner sign-off' : ['Not started', 'In progress', 'Disputed'].includes(i.status))).length,
  }
}
