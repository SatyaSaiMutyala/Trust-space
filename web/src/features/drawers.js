/* Drawer kind → component map (the prototype's DRAWERS). Open with openDrawer({ kind, ...params }). */
import PropertyFormDrawer from './properties/PropertyFormDrawer'
import LeaseFormDrawer from './leases/LeaseFormDrawer'
import LeaseViewDrawer from './leases/LeaseViewDrawer'
import OwnerFormDrawer from './owners/OwnerFormDrawer'
import OwnerViewDrawer from './owners/OwnerViewDrawer'
import InvoiceFormDrawer from './invoices/InvoiceFormDrawer'
import InvoiceViewDrawer from './invoices/InvoiceViewDrawer'
import TicketFormDrawer from './tickets/TicketFormDrawer'
import TicketViewDrawer from './tickets/TicketViewDrawer'
import ExitStartDrawer from './exits/ExitStartDrawer'
import InspectDrawer from './inspections/InspectDrawer'
import ReqDrawer from './sites/ReqDrawer'
import SiteDrawer from './sites/SiteDrawer'
import PartnerDrawer from './sites/PartnerDrawer'
import PartnersDrawer from './sites/PartnersDrawer'

export const DRAWERS = {
  property: PropertyFormDrawer, lease: LeaseFormDrawer, leaseView: LeaseViewDrawer,
  owner: OwnerFormDrawer, ownerView: OwnerViewDrawer,
  invoice: InvoiceFormDrawer, invoiceView: InvoiceViewDrawer,
  ticket: TicketFormDrawer, ticketView: TicketViewDrawer,
  exitStart: ExitStartDrawer, inspect: InspectDrawer,
  req: ReqDrawer, site: SiteDrawer, partner: PartnerDrawer, partners: PartnersDrawer,
}
