/* Redux Toolkit slices: auth, snackbar notifications, records (entities) and list query params. */
import { createSlice, createEntityAdapter } from '@reduxjs/toolkit'
import { COLS } from '../domain/constants'

/* ---------- auth ---------- */
const authSlice = createSlice({
  name: 'auth',
  initialState: { status: 'checking', user: null, accessToken: null, mediaToken: null }, // status: checking | signedOut | signedIn
  reducers: {
    credentialsReceived(s, { payload }) {
      if (payload.user) s.user = payload.user
      if (payload.accessToken) s.accessToken = payload.accessToken
      if (payload.mediaToken) s.mediaToken = payload.mediaToken
      s.status = 'signedIn'
    },
    signedOut(s) { s.status = 'signedOut'; s.user = null; s.accessToken = null; s.mediaToken = null },
  },
})
export const { credentialsReceived, signedOut } = authSlice.actions

/* ---------- snackbar notifications (messages come from the API) ---------- */
let seq = 0
const notifySlice = createSlice({
  name: 'notify',
  initialState: { queue: [] },
  reducers: {
    notify: {
      reducer(s, { payload }) { s.queue.push(payload) },
      prepare: (message, severity = 'info') => ({ payload: { key: ++seq, message, severity } }),
    },
    dismiss(s, { payload }) { s.queue = s.queue.filter(n => n.key !== payload) },
  },
})
export const { notify, dismiss } = notifySlice.actions

/* ---------- records: one entity adapter per collection ---------- */
export const adapter = createEntityAdapter()
const entitiesSlice = createSlice({
  name: 'entities',
  // status: idle | loading | ready | failed
  initialState: { status: 'idle', error: null, ...Object.fromEntries(COLS.map(c => [c, adapter.getInitialState()])) },
  reducers: {
    loadStarted(s) { s.status = 'loading'; s.error = null },
    loadFailed(s, { payload }) { s.status = 'failed'; s.error = payload },
    collectionLoaded(s, { payload: { col, rows } }) { adapter.setAll(s[col], rows) },
    loadFinished(s) { s.status = 'ready' },
    recordReplaced(s, { payload: { col, rec } }) { adapter.setOne(s[col], rec) },
    recordRemoved(s, { payload: { col, id } }) { adapter.removeOne(s[col], id) },
    entitiesCleared(s) { s.status = 'idle'; s.error = null; for (const c of COLS) s[c] = adapter.getInitialState() },
  },
})
export const { loadStarted, loadFailed, collectionLoaded, loadFinished, recordReplaced, recordRemoved, entitiesCleared } = entitiesSlice.actions

/* ---------- list params (search, page, limit, filters, date range, sort) per list on screen ---------- */
export const LIST_DEFAULTS = { search: '', page: 1, limit: 10, filters: {}, from: '', to: '', sort: '', order: '' }
const listsSlice = createSlice({
  name: 'lists',
  initialState: {},
  reducers: {
    listChanged(s, { payload: { key, patch, defaults } }) {
      const cur = s[key] || { ...LIST_DEFAULTS, ...defaults }
      const next = { ...cur, ...patch, filters: patch.filters ? { ...cur.filters, ...patch.filters } : cur.filters }
      if (!('page' in patch)) next.page = 1 // any change other than paging goes back to page 1
      s[key] = next
    },
    listReset(s, { payload: { key, defaults } }) { s[key] = { ...LIST_DEFAULTS, ...defaults } },
  },
})
export const { listChanged, listReset } = listsSlice.actions

export const reducers = { auth: authSlice.reducer, notify: notifySlice.reducer, entities: entitiesSlice.reducer, lists: listsSlice.reducer }
