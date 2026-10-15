/*
 * After sign-in, load every record the user may see (the API limits it to their scope) through the paginated list
 * endpoints, 100 at a time. Overview figures, the rent roll, ledgers and statuses are calculated from these records.
 */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { COLS } from '../domain/constants'
import { callApi } from './store'
import { loadStarted, loadFailed, collectionLoaded, loadFinished } from './slices'

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
    dispatch(loadFinished())
  } catch (e) {
    dispatch(loadFailed(e.message))
  }
})
