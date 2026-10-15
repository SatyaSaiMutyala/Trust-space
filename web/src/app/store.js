/* The Redux Toolkit store. */
import { configureStore } from '@reduxjs/toolkit'
import { api, errorMessage } from './api'
import { reducers } from './slices'

export const reduxStore = configureStore({
  reducer: { ...reducers, [api.reducerPath]: api.reducer },
  middleware: getDefault => getDefault({ serializableCheck: false, immutableCheck: false }).concat(api.middleware),
})
export const dispatch = reduxStore.dispatch
export const getState = reduxStore.getState

/** Run an RTK Query endpoint outside React: resolves the response body or throws an Error with the server's message. */
export async function callApi(endpoint, arg) {
  const req = dispatch(api.endpoints[endpoint].initiate(arg, endpoint === 'list' ? { forceRefetch: true, subscribe: false } : undefined))
  const res = await req
  if (res.error) { const e = new Error(errorMessage(res.error)); e.status = res.error.status; e.code = res.error.data?.code; e.errors = res.error.data?.errors; throw e }
  return res.data
}
