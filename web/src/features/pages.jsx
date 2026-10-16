/* Route → page map (the prototype's viewRoute). */
import OverviewPage from './overview/OverviewPage'
import PropertiesPage from './properties/PropertiesPage'
import PropertyDetailPage from './properties/PropertyDetailPage'
import LeasesPage from './leases/LeasesPage'
import InvoicesPage from './invoices/InvoicesPage'
import LedgersPage from './ledgers/LedgersPage'
import OwnersPage from './owners/OwnersPage'
import OwnerHomePage from './ownerPortal/OwnerHomePage'
import OwnerDocsPage from './ownerPortal/OwnerDocsPage'
import OwnerMePage from './ownerPortal/OwnerMePage'
import TicketsPage from './tickets/TicketsPage'
import MessagesPage from './messages/MessagesPage'
import ExitsPage from './exits/ExitsPage'
import AccessPage from './access/AccessPage'
import GatePage from './access/GatePage'
import InspectionsPage from './inspections/InspectionsPage'
import SitesPage from './sites/SitesPage'
import OpeningPage from './opening/OpeningPage'
import TdsPage from './tds/TdsPage'
import { UI, APP, role, useStore } from '../store/store'
import ErrorBoundary from '../components/app/ErrorBoundary'

const PAGES = {
  overview: OverviewPage, properties: PropertiesPage, property: PropertyDetailPage, leases: LeasesPage,
  invoices: InvoicesPage, tickets: TicketsPage, messages: MessagesPage, exits: ExitsPage, inspections: InspectionsPage,
  sites: SitesPage, owners: OwnersPage, access: AccessPage, 'o-home': OwnerHomePage, 'o-docs': OwnerDocsPage, 'o-me': OwnerMePage, ledgers: LedgersPage, opening: OpeningPage, tds: TdsPage,
}

export default function CurrentPage() {
  useStore()
  if (role().kind === 'none') return <GatePage />
  const Page = PAGES[UI.route] || OverviewPage
  return <ErrorBoundary resetKey={[UI.route, UI.sel, UI.tab, APP.user?.id].join('|')}><Page /></ErrorBoundary>
}
