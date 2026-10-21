/*
 * Cross-feature actions (the prototype's data-act handlers that several screens share).
 * Feature-specific actions live next to their feature.
 */
import { S, save, toast, openDrawer, openConv, openProp, go, actor } from './store'
import { buildInspection, inspOf } from '../domain/inspection'
import { depAdjs } from '../domain/lease'
import { newId, nowISO, TODAY, inr } from '../domain/utils'

export const openInv = id => openDrawer({ kind: 'invoiceView', id })
export const newInvoice = (d = {}) => openDrawer({ kind: 'invoice', prop: d.prop, lease: d.lease, period: d.period, type: d.type, mode: d.mode, owner: d.owner })
export const openTicket = id => openDrawer({ kind: 'ticketView', id })
export const newTicket = pid => openDrawer({ kind: 'ticket', prop: pid })
export const openLease = id => openDrawer({ kind: 'leaseView', id })
export const editLease = id => openDrawer({ kind: 'lease', id })
export const newLease = pid => openDrawer({ kind: 'lease', prop: pid })
export const viewOwnerProfile = id => openDrawer({ kind: 'ownerView', id })
export const editOwner = id => openDrawer({ kind: 'owner', id })
export const newOwner = () => openDrawer({ kind: 'owner' })
export const newProperty = () => openDrawer({ kind: 'property' })
export const editProperty = id => openDrawer({ kind: 'property', id })
export const importOpen = sheet => openDrawer({ kind: 'import', sheet }) // Excel import: 'owners' | 'properties' | 'leases' (the page's own sheet)
export const openInsp = id => openDrawer({ kind: 'inspect', id })
export const openSite = id => openDrawer({ kind: 'site', id })
/** Rent for one month of a co-owned lease, owner by owner. */
export const rentMonth = (lease, period) => openDrawer({ kind: 'rentMonth', lease, period })
/** Settle rent months from the security deposit; preset = [{ period, ownerId }] to pre-tick. */
export const extendOpen = id => openDrawer({ kind: 'extend', id }) // extend a lease: new end date, optional revised rent, addendum
export const depAdjOpen = (lease, preset) => openDrawer({ kind: 'depAdj', lease, preset: preset || null })
/** Deactivate / add / reactivate a co-owner on a lease (mode: 'deactivate' | 'add' | 'reactivate'). */
export const ownerChangeOpen = (lease, mode, ownerId) => openDrawer({ kind: 'ownerChange', lease, mode, ownerId: ownerId || null })
export const obEdit = id => openDrawer({ kind: 'opening', id })
export const obPay = (lease, item) => openDrawer({ kind: 'obPay', lease, item })
export const startExit = id => { if (!id) { toast('Choose a lease first', 'warning'); return } openDrawer({ kind: 'exitStart', id }) }

/** Start (or resume) a joint inspection for a lease. */
export function newInsp(leaseId, kind) {
  const L = S.leases.find(l => l.id === leaseId); const ex = inspOf(L.id, kind)
  if (ex && ex.status !== 'Signed') { openInsp(ex.id); return }
  if (kind === 'Move-out' && !inspOf(L.id, 'Move-in')) toast('No take-over inspection on record — items will have no baseline to compare against.', 'warning')
  const I = buildInspection(L, kind); I.id = newId(); save('inspections', I, true); openInsp(I.id)
}

/** Mark unpaid rent invoices settled where an agreed deposit adjustment covers them. */
export async function settleWithDeposit(L) {
  for (const a of depAdjs(L)) {
    const inv = S.invoices.find(i => i.leaseId === L.id && i.type === 'Rent' && i.period === a.period && (i.ownerId || L.ownerId) === a.ownerId && !['Paid', 'Rejected'].includes(i.status)); if (!inv) continue
    if ((+a.amount || 0) + 1 >= inv.net) {
      Object.assign(inv, { status: 'Paid', paidBy: 'Deposit', paidDate: a.period + '-01' > TODAY ? TODAY : (a.consent?.on || TODAY), paidAmount: inv.net, tdsDeducted: inv.tds, utr: 'Deposit adjustment' })
      inv.log = (inv.log || []).concat({ at: nowISO(), by: actor(), text: `Settled from security deposit (${inr(inv.net)}) — ${a.consent?.how || 'agreed'}${a.consent?.ref ? ' · ' + a.consent.ref : ''}` })
      await save('invoices', inv, true)
    }
  }
}

/** Dispatch an action descriptor such as {act:'openInv', id}. */
export function runAct(a) {
  switch (a.act) {
    case 'openInv': return openInv(a.id)
    case 'newInvoice': return newInvoice(a)
    case 'openTicket': return openTicket(a.id)
    case 'openLease': return openLease(a.id)
    case 'openInsp': return openInsp(a.id)
    case 'newInsp': return newInsp(a.lease, a.kind)
    case 'viewOwnerProfile': return viewOwnerProfile(a.id)
    case 'openConv': return openConv(a.id)
    case 'openProp': return openProp(a.id, a.tab)
    case 'rentMonth': return rentMonth(a.lease, a.period)
    case 'go': return go(a.r)
    default: return undefined
  }
}
