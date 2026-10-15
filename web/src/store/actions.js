/*
 * Cross-feature actions (the prototype's data-act handlers that several screens share).
 * Feature-specific actions live next to their feature.
 */
import { S, save, toast, openDrawer, openConv, openProp } from './store'
import { buildInspection, inspOf } from '../domain/inspection'
import { newId } from '../domain/utils'

export const openInv = id => openDrawer({ kind: 'invoiceView', id })
export const newInvoice = (d = {}) => openDrawer({ kind: 'invoice', prop: d.prop, lease: d.lease, period: d.period, type: d.type, mode: d.mode })
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
export const openInsp = id => openDrawer({ kind: 'inspect', id })
export const openSite = id => openDrawer({ kind: 'site', id })
export const startExit = id => { if (!id) { toast('Choose a lease first', 'warning'); return } openDrawer({ kind: 'exitStart', id }) }

/** Start (or resume) a joint inspection for a lease. */
export function newInsp(leaseId, kind) {
  const L = S.leases.find(l => l.id === leaseId); const ex = inspOf(L.id, kind)
  if (ex && ex.status !== 'Signed') { openInsp(ex.id); return }
  if (kind === 'Move-out' && !inspOf(L.id, 'Move-in')) toast('No take-over inspection on record — items will have no baseline to compare against.', 'warning')
  const I = buildInspection(L, kind); I.id = newId(); save('inspections', I, true); openInsp(I.id)
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
    default: return undefined
  }
}
