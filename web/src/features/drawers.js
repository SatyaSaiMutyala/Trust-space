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
import SkipInspectionDrawer from './inspections/SkipInspectionDrawer'
import ReqDrawer from './sites/ReqDrawer'
import SiteDrawer from './sites/SiteDrawer'
import PartnerDrawer from './sites/PartnerDrawer'
import PartnersDrawer from './sites/PartnersDrawer'
import RentMonthDrawer from './leases/RentMonthDrawer'
import DepAdjDrawer from './leases/DepAdjDrawer'
import OwnerChangeDrawer from './leases/OwnerChangeDrawer'
import OpeningDrawer from './opening/OpeningDrawer'
import ObPayDrawer from './opening/ObPayDrawer'
import TdsMonthDrawer from './tds/TdsMonthDrawer'
import TdsChallanDrawer from './tds/TdsChallanDrawer'
import TdsReturnDrawer from './tds/TdsReturnDrawer'
import Tds16Drawer from './tds/Tds16Drawer'
import TdsCertDrawer from './tds/TdsCertDrawer'
import ImportDrawer from './import/ImportDrawer'
import ExtendDrawer from './leases/ExtendDrawer'

export const DRAWERS = {
  property: PropertyFormDrawer, lease: LeaseFormDrawer, leaseView: LeaseViewDrawer,
  owner: OwnerFormDrawer, ownerView: OwnerViewDrawer,
  invoice: InvoiceFormDrawer, invoiceView: InvoiceViewDrawer,
  ticket: TicketFormDrawer, ticketView: TicketViewDrawer,
  exitStart: ExitStartDrawer, inspect: InspectDrawer, skipInsp: SkipInspectionDrawer,
  req: ReqDrawer, site: SiteDrawer, partner: PartnerDrawer, partners: PartnersDrawer,
  rentMonth: RentMonthDrawer, depAdj: DepAdjDrawer, ownerChange: OwnerChangeDrawer, opening: OpeningDrawer, obPay: ObPayDrawer,
  tdsMonth: TdsMonthDrawer, tdsChallan: TdsChallanDrawer, tdsReturn: TdsReturnDrawer, tds16: Tds16Drawer, tdsCert: TdsCertDrawer,
  import: ImportDrawer, extend: ExtendDrawer,
}
