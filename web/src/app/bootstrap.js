/*
 * After sign-in, load every record the user may see (the API limits it to their scope) through the paginated list
 * endpoints, 100 at a time. Overview figures, the rent roll, ledgers and statuses are calculated from these records.
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { COLS } from '../domain/constants'
import { callApi, dispatch, getState } from './store'
import { loadStarted, loadFailed, collectionLoaded, loadFinished } from './slices'
import { APP } from '../store/store'

const PAGE = 100

async function fetchAll(resource) {
  const rows = []
  for (let page = 1; page < 1000; page++) {
    const res = await callApi('list', { resource, params: { page, limit: PAGE } })
    rows.push(...res.data)
    if (!res.pagination?.hasNext) break
  }
  return rows
}

export const loadPortfolio = createAsyncThunk('entities/loadPortfolio', async (_, { dispatch }) => {
  dispatch(loadStarted())
  try {
    const results = await Promise.all(COLS.map(async col => [col, await fetchAll(col)]))
    for (const [col, rows] of results) dispatch(collectionLoaded({ col, rows }))
    dispatch(loadFinished()); lastRefresh = Date.now()
  } catch (e) {
    dispatch(loadFailed(e.message))
  }
})

/* ---------- keeping the screen current: colleagues on other machines change records too ---------- */
let refreshing = false, lastRefresh = 0
const MIN_GAP = 10000 // ms between refreshes — quick clicks between pages don't each hit the API

/** Re-fetch every collection in the background and swap it in — skipped while a drawer is open or a save is in flight,
 *  so nothing the user is editing gets replaced under them. Silent on failure (the next tick tries again). */
export async function refreshPortfolio({ force = false } = {}) {
  const st = getState()
  if (st.auth.status !== 'signedIn' || st.entities.status !== 'ready') return
  if (refreshing || APP.pending > 0) return
  if (!force && (APP.drawer || Date.now() - lastRefresh < MIN_GAP)) return
  refreshing = true
  try {
    const results = await Promise.all(COLS.map(async col => [col, await fetchAll(col)]))
    if (APP.pending > 0 || APP.drawer || getState().auth.status !== 'signedIn') return // something started meanwhile — keep local state
    for (const [col, rows] of results) dispatch(collectionLoaded({ col, rows }))
    lastRefresh = Date.now()
  } catch (e) {
    console.warn('Background refresh failed:', e.message)
  } finally { refreshing = false }
}

let started = false
/** No timer — the API is only asked again when the user comes back to the tab (page navigation refreshes too, see App.jsx). */
export function startAutoRefresh() {
  if (started) return; started = true
  const back = () => { if (document.visibilityState === 'visible') refreshPortfolio() }
  document.addEventListener('visibilitychange', back)
  window.addEventListener('focus', back)
}
