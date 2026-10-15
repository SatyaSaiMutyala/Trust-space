/*
 * Server-side list state for one list on screen. Search, filters, date range, sort, page and page size live in
 * Redux (lists slice, keyed by `key`); rows come from RTK Query: GET /api/<resource>?search=&page=&limit=&from=&to=&<filters>.
 * Load errors are announced in the snackbar with the API's message.
 *
 *   const L = useServerList('invoices', 'invoices', { defaults: { limit: 10 }, fixed: { propertyId } })
 *   L.rows, L.pagination, L.message, L.isFetching, L.params, L.set({ search }), L.setFilter('status', 'Paid'), L.reset()
 */
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { listChanged, listReset, LIST_DEFAULTS, notify } from '../../app/slices'
import { useListQuery, errorMessage } from '../../app/api'

const EMPTY = []

export function useServerList(key, resource, { defaults = {}, fixed = {}, skip = false } = {}) {
  const rdx = useDispatch()
  const stored = useSelector(s => s.lists[key])
  const params = stored || { ...LIST_DEFAULTS, ...defaults, filters: { ...(defaults.filters || {}) } }

  const query = { page: params.page, limit: params.limit, search: params.search.trim(), from: params.from, to: params.to, sort: params.sort, order: params.order }
  for (const [k, v] of Object.entries(params.filters)) if (v !== '' && v !== undefined && v !== null) query[k] = v
  Object.assign(query, fixed)

  const { data, error, isFetching, isLoading, refetch } = useListQuery({ resource, params: query }, { skip, refetchOnMountOrArgChange: 30 })

  useEffect(() => { if (error) rdx(notify(errorMessage(error), 'error')) }, [error, rdx])

  const set = patch => rdx(listChanged({ key, patch, defaults }))
  return {
    params,
    set,
    setFilter: (name, value) => set({ filters: { [name]: value } }),
    reset: () => rdx(listReset({ key, defaults })),
    rows: data?.data || EMPTY,
    pagination: data?.pagination,
    message: data?.message || '',
    isFetching, isLoading, error, refetch,
    /** true when any search, filter or date is applied (to show “Clear”) */
    filtered: !!(params.search || params.from || params.to || Object.values(params.filters).some(v => v !== '' && v != null)),
  }
}
