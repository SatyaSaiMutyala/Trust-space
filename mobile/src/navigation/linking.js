/* Deep links (truspace://…). Screens open from notifications and links. */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const linking = {
  prefixes: ['truspace://'],
  config: {
    screens: {
      Login: 'login', SignUpEmail: 'signup', SignUpPending: 'signup/pending',
      Tabs: { screens: { Home: 'home', Inspect: 'inspect', Repairs: 'repairs', Messages: 'messages', Invoices: 'invoices', Locations: 'locations', More: 'more' } },
      RentRoll: 'rent-roll', PropertyDetail: 'property/:id?', SiteEvaluation: 'site/:id?', ToApprove: 'approve', TicketDetail: 'ticket/:id?',
      Thread: 'thread/:id?', Tds: 'tds', InspectionHub: 'inspection/:id', InspectionItem: 'inspection/:id/item/:k', InspectionArea: 'inspection/:id/area/:sec', AreaPhotos: 'inspection/:id/photos',
      VideoRecording: 'inspection/:id/video', SignOff: 'inspection/:id/signoff', Properties: 'properties', SiteScouting: 'sites', Leases: 'leases',
      Exits: 'exits', Owners: 'owners', Invoices: 'staff-invoices', Deposits: 'deposits', OwnerLedgers: 'ledgers', Search: 'search',
      Notifications: 'notifications', NewInvoice: 'owner/new-invoice', DepositRequest: 'owner/deposit/:id?',
      RecordChallan: 'tds/challan', RaiseTicket: 'ticket/new', AddSite: 'site/new', OwnerLedger: 'owner/ledger', Agreements: 'owner/agreements', MyDetails: 'owner/details', DeleteAccount: 'account/delete',
    },
  },
};
