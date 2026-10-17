/* Everything a server-side report needs about the signed-in user's world: the records they may see (same scope as the
   list endpoints), lookups for owners and premises, and a calculation context for shared/calc. */
import { models, toApi } from '../models/index.js'
import { scopeFilter } from '../auth/scope.js'
import { byPath } from '../resources/config.js'
import { makeCtx } from '../../../shared/calc/index.js'

/** Dates are judged in India, whatever the server's clock zone. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

/** { user, today, me, invoices, leases, props, owners, ctx } — invoices/leases/props scoped to the user; owners all (for TDS lookups). */
export async function reportContext(user) {
  // Same scope and same order as the list endpoints the web app loads from, so rows and ties fall in the same order.
  const load = async (path, filter) => models[path].find(filter === undefined ? (await scopeFilter(path, user)) || {} : filter).sort({ ...(byPath[path].sort || { createdAt: -1 }), _id: 1 }).lean()
  const [invoices, leases, props, owners] = await Promise.all([load('invoices'), load('leases'), load('properties'), load('owners', {})])
  const inv = invoices.map(toApi), ls = leases.map(toApi), ps = props.map(toApi), os = owners.map(toApi)
  const me = user.role === 'owner' ? user.ownerId : null
  const ctx = makeCtx({ today: todayIST(), owners: os, props: ps, invoices: inv, me, ownerView: user.role === 'owner' })
  return { user, today: ctx.today, me, invoices: inv, leases: ls, props: ps, owners: os, ctx }
}
