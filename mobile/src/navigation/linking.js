/* Deep links (truspace://…). Screens open from notifications and links; `truspace://signin/<role>` signs in a
   sample user while the API is not wired (also used by the screenshot tooling). */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const linking = {
  prefixes: ['truspace://'],
  config: {
    screens: {
      Login: 'login', SignUpPhone: 'signup', SignUpPending: 'signup/pending',
      Tabs: { screens: { Home: 'home', Inspect: 'inspect', Repairs: 'repairs', Messages: 'messages', Invoices: 'invoices', Locations: 'locations' } },
      RentRoll: 'rent-roll', PropertyDetail: 'property/:id?', SiteEvaluation: 'site/:id?', ToApprove: 'approve', TicketDetail: 'ticket/:id?',
      Thread: 'thread/:id?', Tds: 'tds', InspectionItem: 'inspection/item', InspectionArea: 'inspection/area', AreaPhotos: 'inspection/photos',
      VideoRecording: 'inspection/video', SignOff: 'inspection/signoff', Properties: 'properties', SiteScouting: 'sites', Leases: 'leases',
      Exits: 'exits', Owners: 'owners', Invoices: 'staff-invoices', Deposits: 'deposits', OwnerLedgers: 'ledgers', Search: 'search',
      Notifications: 'notifications', NewInvoice: 'owner/new-invoice', OwnerCheckSign: 'owner/check', DepositRequest: 'owner/deposit',
      RecordChallan: 'tds/challan', RaiseTicket: 'ticket/new', AddSite: 'site/new', OwnerLedger: 'owner/ledger', Agreements: 'owner/agreements', MyDetails: 'owner/details', DeleteAccount: 'account/delete',
    },
  },
};

/** Handles the non-screen links. Returns true when the url was consumed. */
export function handleAppLink(url, dispatch, signedIn) {
  const m = /^truspace:\/\/signin\/(staff|owner|franchise)/.exec(url || '');
  if (m) { dispatch(signedIn({ role: m[1] })); return true; }
  return false;
}
