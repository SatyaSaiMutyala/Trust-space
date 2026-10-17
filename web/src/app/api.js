/*
 * RTK Query API. Every request carries the access token; when it expires the client renews it once through the
 * refresh cookie (POST /auth/refresh) and repeats the request. Responses keep the server's `message`.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { credentialsReceived, signedOut } from './slices'

export const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const raw = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const t = getState().auth.accessToken
    if (t) headers.set('Authorization', 'Bearer ' + t)
    return headers
  },
})

let refreshing = null
const NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password']

async function baseQuery(args, api, extra) {
  let res = await raw(args, api, extra)
  const url = typeof args === 'string' ? args : args.url
  if (res.error?.status === 401 && !NO_RETRY.some(u => url.startsWith(u))) {
    // One refresh at a time: the refresh token rotates, so parallel refreshes would cancel each other.
    refreshing ||= raw({ url: '/auth/refresh', method: 'POST' }, api, extra).finally(() => setTimeout(() => { refreshing = null }, 0))
    const r = await refreshing
    if (r.data?.data?.accessToken) {
      api.dispatch(credentialsReceived(r.data.data))
      res = await raw(args, api, extra)
    } else {
      api.dispatch(signedOut())
    }
  }
  return res
}

/** The server's message for an RTK Query error (or a readable reason when the server could not be reached). */
export function errorMessage(error) {
  if (!error) return ''
  if (error.data?.message) return error.data.message
  if (error.status === 'FETCH_ERROR') return 'Can’t reach the TruSpace server. Check your connection and try again.'
  if (error.status === 'PARSING_ERROR') return 'The server sent an unexpected reply. Please try again.'
  if (error.status === 'TIMEOUT_ERROR') return 'The server took too long to reply. Please try again.'
  return error.error || 'Something went wrong. Please try again.'
}

export const qs = params => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') p.set(k, v)
  const s = p.toString()
  return s ? '?' + s : ''
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['List'],
  endpoints: b => ({
    /* auth */
    login: b.mutation({ query: body => ({ url: '/auth/login', method: 'POST', body }) }),
    refresh: b.mutation({ query: () => ({ url: '/auth/refresh', method: 'POST' }) }),
    logout: b.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    forgotPassword: b.mutation({ query: body => ({ url: '/auth/forgot-password', method: 'POST', body }) }),
    resetPassword: b.mutation({ query: body => ({ url: '/auth/reset-password', method: 'POST', body }) }),
    changePassword: b.mutation({ query: body => ({ url: '/auth/change-password', method: 'POST', body }) }),

    /* any resource list: /api/<resource>?search=&page=&limit=&from=&to=&sort=&order=&<filters> → { message, data, pagination } */
    list: b.query({
      query: ({ resource, params }) => `/${resource}${qs(params)}`,
      providesTags: (r, e, { resource }) => [{ type: 'List', id: resource }],
    }),
    saveRecord: b.mutation({
      query: ({ resource, rec }) => ({ url: `/${resource}/${encodeURIComponent(rec.id)}`, method: 'PUT', body: rec }),
      invalidatesTags: (r, e, { resource }) => [{ type: 'List', id: resource }],
    }),
    removeRecord: b.mutation({
      query: ({ resource, id }) => ({ url: `/${resource}/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: (r, e, { resource }) => [{ type: 'List', id: resource }, { type: 'List', id: 'trash' }],
    }),

    /* trash */
    trash: b.query({ query: () => '/trash', providesTags: [{ type: 'List', id: 'trash' }] }),
    trashRestore: b.mutation({ query: ({ resource, id }) => ({ url: `/trash/${resource}/${encodeURIComponent(id)}/restore`, method: 'POST' }), invalidatesTags: (r, e, { resource }) => [{ type: 'List', id: 'trash' }, { type: 'List', id: resource }] }),
    trashDestroy: b.mutation({ query: ({ resource, id }) => ({ url: `/trash/${resource}/${encodeURIComponent(id)}`, method: 'DELETE' }), invalidatesTags: [{ type: 'List', id: 'trash' }] }),
    trashEmpty: b.mutation({ query: () => ({ url: '/trash', method: 'DELETE' }), invalidatesTags: [{ type: 'List', id: 'trash' }] }),

    /* server-computed reports (shared/calc on the API) — refetched when the records they depend on are saved */
    tdsReport: b.query({
      query: ({ fy }) => `/tds/report${qs({ fy })}`,
      providesTags: ['tds', 'invoices', 'leases', 'owners'].map(id => ({ type: 'List', id })),
    }),
    ownerF16: b.query({
      query: ownerId => `/tds/owner/${encodeURIComponent(ownerId)}/f16`,
      providesTags: ['tds', 'invoices', 'leases', 'owners'].map(id => ({ type: 'List', id })),
    }),
    tdsReturnCsv: b.query({ query: ({ fy, q }) => ({ url: `/tds/return.csv${qs({ fy, q })}`, responseHandler: 'text' }) }),
    leaseSchedule: b.query({
      query: id => `/leases/${encodeURIComponent(id)}/schedule`,
      providesTags: ['leases', 'owners'].map(id => ({ type: 'List', id })),
    }),
    leaseScheduleCsv: b.query({ query: id => ({ url: `/leases/${encodeURIComponent(id)}/schedule.csv`, responseHandler: 'text' }) }),
    ledger: b.query({
      query: p => `/ledgers${qs(p)}`,
      providesTags: ['invoices', 'leases', 'owners', 'properties'].map(id => ({ type: 'List', id })),
    }),
    ledgerCsv: b.query({ query: p => ({ url: `/ledgers.csv${qs(p)}`, responseHandler: 'text' }) }),
    rentRoll: b.query({
      query: ({ months }) => `/rent-roll${qs({ months })}`,
      providesTags: ['invoices', 'leases', 'owners'].map(id => ({ type: 'List', id })),
    }),
    rentStatus: b.query({
      query: () => '/rent-status',
      providesTags: ['invoices', 'leases', 'owners', 'properties'].map(id => ({ type: 'List', id })),
    }),
    opening: b.query({
      query: () => '/opening',
      providesTags: ['invoices', 'leases', 'owners'].map(id => ({ type: 'List', id })),
    }),
    openingFill: b.query({ query: ({ id, from }) => `/leases/${encodeURIComponent(id)}/opening-fill${qs({ from })}` }),
    leaseDeposit: b.query({
      query: id => `/leases/${encodeURIComponent(id)}/deposit`,
      providesTags: ['leases', 'invoices', 'owners'].map(id => ({ type: 'List', id })),
    }),
    deposits: b.query({
      query: () => '/deposits',
      providesTags: ['leases', 'invoices', 'owners'].map(id => ({ type: 'List', id })),
    }),
    openingPay: b.query({
      query: ({ id, itemId }) => `/leases/${encodeURIComponent(id)}/opening-pay/${encodeURIComponent(itemId)}`,
      providesTags: ['leases', 'owners'].map(id => ({ type: 'List', id })),
    }),

    /* uploads */
    upload: b.mutation({ query: file => { const fd = new FormData(); fd.append('file', file); return { url: '/assets', method: 'POST', body: fd } } }),

    /* portal accounts */
    createUser: b.mutation({ query: body => ({ url: '/users', method: 'POST', body }), invalidatesTags: [{ type: 'List', id: 'users' }] }),
    updateUser: b.mutation({ query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }), invalidatesTags: [{ type: 'List', id: 'users' }] }),
    deleteUser: b.mutation({ query: id => ({ url: `/users/${id}`, method: 'DELETE' }), invalidatesTags: [{ type: 'List', id: 'users' }] }),
    unlockUser: b.mutation({ query: id => ({ url: `/users/${id}/unlock`, method: 'POST' }), invalidatesTags: [{ type: 'List', id: 'users' }] }),
    resetUserPassword: b.mutation({ query: id => ({ url: `/users/${id}/reset-password`, method: 'POST' }), invalidatesTags: [{ type: 'List', id: 'users' }] }),
  }),
})

export const { useListQuery } = api
