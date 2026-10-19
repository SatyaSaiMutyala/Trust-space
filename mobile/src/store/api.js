/* RTK Query API client — the same REST API the web uses. Every request carries the access token; when it expires the
   client renews it once through the refresh cookie (POST /auth/refresh, kept by the native cookie store) and repeats
   the request. A failed refresh signs the user out. Responses keep the server's `message` for toasts. */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../config/env';
import { credentialsReceived, signedOut } from './slices/authSlice';

const raw = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  timeout: 20000,
  prepareHeaders: (headers, { getState }) => {
    const t = getState().auth.accessToken;
    if (t) headers.set('authorization', `Bearer ${t}`);
    headers.set('accept', 'application/json');
    return headers;
  },
});

let refreshing = null;
const NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/auth/register'];

async function baseQuery(args, api, extra) {
  let res = await raw(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (res.error && res.error.status === 401 && !NO_RETRY.some(p => url.startsWith(p))) {
    // one refresh at a time: the refresh token rotates, so parallel refreshes would cancel each other
    refreshing ||= raw({ url: '/auth/refresh', method: 'POST' }, api, extra).finally(() => setTimeout(() => { refreshing = null; }, 0));
    const r = await refreshing;
    if (r.data?.data?.accessToken) {
      api.dispatch(credentialsReceived({ accessToken: r.data.data.accessToken, mediaToken: r.data.data.mediaToken, user: r.data.data.user }));
      res = await raw(args, api, extra);
    } else {
      api.dispatch(signedOut());
    }
  }
  return res;
}

/** Plain-language error text from a failed request (the server's message, or a network explanation). */
export function errorMessage(err) {
  if (!err) return 'Something went wrong.';
  if (err.status === 'FETCH_ERROR' || err.status === 'TIMEOUT_ERROR') return 'Could not reach the server. Check your connection and try again.';
  return err.data?.message || (typeof err.error === 'string' ? err.error : 'Something went wrong.');
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'List', 'Overview', 'Notifications', 'Inspections', 'Threads'],
  endpoints: b => ({
    login: b.mutation({ query: body => ({ url: '/auth/login', method: 'POST', body }) }),
    refresh: b.mutation({ query: () => ({ url: '/auth/refresh', method: 'POST' }) }),
    logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    forgotPassword: b.mutation({ query: body => ({ url: '/auth/forgot-password', method: 'POST', body }) }),
    // owner self sign-up: email code → confirm → create the pending account
    registerStart: b.mutation({ query: body => ({ url: '/auth/register/start', method: 'POST', body }) }),
    registerVerify: b.mutation({ query: body => ({ url: '/auth/register/verify', method: 'POST', body }) }),
    register: b.mutation({ query: body => ({ url: '/auth/register', method: 'POST', body }) }),
    deleteAccount: b.mutation({ query: body => ({ url: '/auth/delete-account', method: 'POST', body }) }),
    // owner messages: one thread per property
    threads: b.query({ query: () => '/mobile/threads', providesTags: ['Threads'] }),
    thread: b.query({ query: ({ propertyId, before }) => ({ url: `/mobile/threads/${encodeURIComponent(propertyId)}`, params: before ? { before } : undefined }), providesTags: (r, e, { propertyId }) => ['Threads', { type: 'Threads', id: propertyId }] }),
    threadRead: b.mutation({ query: propertyId => ({ url: `/mobile/threads/${encodeURIComponent(propertyId)}/read`, method: 'POST' }), invalidatesTags: ['Threads', 'Notifications'] }),
    sendMessage: b.mutation({ query: body => ({ url: '/messages', method: 'POST', body }), invalidatesTags: (r, e, body) => ['Threads', { type: 'Threads', id: body.propertyId }, { type: 'List', id: 'messages' }, 'Notifications'] }),
    // push notification token of this device
    registerPushToken: b.mutation({ query: body => ({ url: '/mobile/push-token', method: 'POST', body }) }),
    // owner self-service
    invoiceDefaults: b.query({ query: params => ({ url: '/mobile/invoice-defaults', params }), providesTags: [{ type: 'List', id: 'invoices' }] }),
    depositRequests: b.query({ query: () => '/mobile/deposit-requests', providesTags: [{ type: 'List', id: 'leases' }, { type: 'List', id: 'invoices' }] }),
    depositAnswer: b.mutation({ query: ({ leaseId, id, action, body }) => ({ url: `/mobile/deposit-requests/${encodeURIComponent(leaseId)}/${encodeURIComponent(id)}/${action}`, method: 'POST', body: body || {} }), invalidatesTags: [{ type: 'List', id: 'leases' }, { type: 'List', id: 'invoices' }, 'Overview', 'Notifications'] }),
    me: b.query({ query: () => '/auth/me', providesTags: ['Me'] }),
    /** Staff Home in one call: rent roll of the month, tiles, needs-you-today. */
    overview: b.query({ query: () => '/mobile/overview', providesTags: ['Overview'] }),
    /** Any resource list: { resource, params: { page, limit, search, sort, order, ...filters } } → { data: [], pagination }. */
    list: b.query({ query: ({ resource, params }) => ({ url: `/${resource}`, params }), providesTags: (r, e, { resource }) => [{ type: 'List', id: resource }] }),
    one: b.query({ query: ({ resource, id }) => `/${resource}/${encodeURIComponent(id)}`, providesTags: (r, e, { resource, id }) => [{ type: 'List', id: resource }, { type: 'List', id: `${resource}:${id}` }] }),
    // server-computed reports (same as the web)
    rentRoll: b.query({ query: (months = 7) => ({ url: '/rent-roll', params: { months } }), providesTags: [{ type: 'List', id: 'invoices' }, { type: 'List', id: 'leases' }] }),
    rentStatus: b.query({ query: () => '/rent-status', providesTags: [{ type: 'List', id: 'invoices' }] }),
    deposits: b.query({ query: () => '/deposits', providesTags: [{ type: 'List', id: 'leases' }] }),
    schedule: b.query({ query: leaseId => `/leases/${encodeURIComponent(leaseId)}/schedule`, providesTags: (r, e, id) => [{ type: 'List', id: `leases:${id}` }] }),
    ledger: b.query({ query: params => ({ url: '/ledgers', params }), providesTags: [{ type: 'List', id: 'invoices' }] }),
    // notifications feed (per user)
    notifications: b.query({ query: () => '/mobile/notifications', providesTags: ['Notifications'] }),
    notificationsRead: b.mutation({ query: ids => ({ url: '/mobile/notifications/read', method: 'POST', body: ids ? { ids } : {} }), invalidatesTags: ['Notifications'] }),
    notificationDelete: b.mutation({ query: id => ({ url: `/mobile/notifications/${encodeURIComponent(id)}`, method: 'DELETE' }), invalidatesTags: ['Notifications'] }),
    notificationsClear: b.mutation({ query: () => ({ url: '/mobile/notifications', method: 'DELETE' }), invalidatesTags: ['Notifications'] }),
    // writes to any resource (the server validates and derives money fields)
    createRecord: b.mutation({ query: ({ resource, body }) => ({ url: `/${resource}`, method: 'POST', body }), invalidatesTags: (r, e, { resource }) => [{ type: 'List', id: resource }, 'Overview', 'Notifications'] }),
    patchRecord: b.mutation({ query: ({ resource, id, body }) => ({ url: `/${resource}/${encodeURIComponent(id)}`, method: 'PATCH', body }), invalidatesTags: (r, e, { resource, id }) => [{ type: 'List', id: resource }, { type: 'List', id: `${resource}:${id}` }, 'Overview', 'Notifications'] }),
    // TDS
    tdsReport: b.query({ query: fy => ({ url: '/tds/report', params: fy ? { fy } : {} }), providesTags: [{ type: 'List', id: 'tds' }, { type: 'List', id: 'invoices' }] }),
    ownerF16: b.query({ query: ({ ownerId, fy }) => ({ url: `/tds/owner/${encodeURIComponent(ownerId)}/f16`, params: fy ? { fy } : {} }), providesTags: [{ type: 'List', id: 'tds' }] }),
    /** A site with its requirement, catchment index, checklist score and items. */
    mobileSite: b.query({ query: id => `/mobile/sites/${encodeURIComponent(id)}`, providesTags: (r, e, id) => [{ type: 'List', id: 'sites' }, { type: 'List', id: `sites:${id}` }] }),
    // joint inspections (take-over / handover): one change per call so offline edits replay in order (see store/offline.js)
    inspections: b.query({ query: () => '/mobile/inspections', providesTags: ['Inspections'] }),
    inspection: b.query({ query: id => `/mobile/inspections/${encodeURIComponent(id)}`, providesTags: (r, e, id) => ['Inspections', { type: 'Inspections', id }] }),
    startInspection: b.mutation({ query: body => ({ url: '/mobile/inspections', method: 'POST', body }), invalidatesTags: ['Inspections', { type: 'List', id: 'inspections' }] }),
    patchInspection: b.mutation({ query: ({ id, body }) => ({ url: `/mobile/inspections/${encodeURIComponent(id)}`, method: 'PATCH', body }), invalidatesTags: (r, e, { id }) => [{ type: 'Inspections', id }, { type: 'List', id: 'inspections' }] }),
    patchInspectionItem: b.mutation({ query: ({ id, k, body }) => ({ url: `/mobile/inspections/${encodeURIComponent(id)}/items/${encodeURIComponent(k)}`, method: 'PATCH', body }), invalidatesTags: (r, e, { id }) => [{ type: 'Inspections', id }] }),
    inspectionAction: b.mutation({ query: ({ id, action, body }) => ({ url: `/mobile/inspections/${encodeURIComponent(id)}/${action}`, method: 'POST', body: body || {} }), invalidatesTags: (r, e, { id }) => ['Inspections', { type: 'Inspections', id }, { type: 'List', id: 'inspections' }, { type: 'List', id: 'leases' }, 'Overview', 'Notifications'] }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useForgotPasswordMutation, useMeQuery, useOverviewQuery, useListQuery, useOneQuery, useRentRollQuery, useRentStatusQuery, useDepositsQuery, useScheduleQuery, useLedgerQuery, useNotificationsQuery, useNotificationsReadMutation, useNotificationDeleteMutation, useNotificationsClearMutation, useCreateRecordMutation, usePatchRecordMutation, useTdsReportQuery, useOwnerF16Query, useMobileSiteQuery, useInspectionsQuery, useInspectionQuery, useStartInspectionMutation, usePatchInspectionMutation, usePatchInspectionItemMutation, useInspectionActionMutation, useRegisterStartMutation, useRegisterVerifyMutation, useRegisterMutation, useDeleteAccountMutation, useInvoiceDefaultsQuery, useDepositRequestsQuery, useDepositAnswerMutation, useThreadsQuery, useThreadQuery, useThreadReadMutation, useSendMessageMutation } = api;

export const SLA_HOURS = { P1: 4, P2: 24, P3: 72, P4: 168 };
export const PRI_LABEL = { P1: 'P1 Critical', P2: 'P2 High', P3: 'P3 Normal', P4: 'P4 Low' };
/** When a ticket's SLA ends. */
export const slaDue = t => new Date(new Date(t.createdAt).getTime() + (SLA_HOURS[t.priority] || 72) * 3600e3);
/** "5 h 40 m left" / "over by 2 h" for an open ticket. */
export function slaText(t, now = new Date()) {
  const m = Math.round((slaDue(t) - now) / 60000); const abs = Math.abs(m); const h = Math.floor(abs / 60), mm = abs % 60;
  const txt = h >= 48 ? `${Math.round(h / 24)} days` : h ? `${h} h${mm ? ` ${mm} m` : ''}` : `${mm} m`;
  return m >= 0 ? `${txt} left` : `over by ${txt}`;
}
export const TICKET_DONE = ['Resolved', 'Closed'];

/** URL of an uploaded file for the phone to open (images, PDFs): carries the media token the server issued at sign-in. */
export const fileUrl = (assetId, mediaToken) => `${API_URL}/assets/${encodeURIComponent(assetId)}/file${mediaToken ? `?t=${encodeURIComponent(mediaToken)}` : ''}`;

/** ₹ with Indian grouping, no decimals: inr(2365400) → "₹23,65,400". */
export const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');

/** Today in IST as YYYY-MM-DD (the server's day). */
export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10" → "Oct 26"; "2026-10-05" → "05 Oct 2026". */
export const perLabel = p => (p ? `${MONTHS[+p.slice(5, 7) - 1]} ${p.slice(2, 4)}` : '');
export const fmtDate = d => (d ? `${d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '');
/** Lease state the way the web shows it (Draft, Terminated, Notice period, Expired, Renewal due, Active). */
export function leaseState(L, today = todayISO()) {
  if (!L) return 'No lease';
  if (L.status === 'Draft') return 'Draft';
  const x = L.exit || {};
  if (x.stage >= 5) return 'Terminated';
  if (x.noticeDate) return 'Notice period';
  if (L.end < today) return 'Expired';
  if ((new Date(L.end) - new Date(today)) / 864e5 <= 120) return 'Renewal due';
  return 'Active';
}
/** Invoice state incl. Overdue (unpaid past its due date). */
export const invState = (i, today = todayISO()) => (i.status === 'Paid' || i.status === 'Rejected' ? i.status : i.dueDate && i.dueDate < today ? 'Overdue' : i.status);
