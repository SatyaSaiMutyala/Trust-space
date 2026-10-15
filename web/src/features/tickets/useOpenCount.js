/*
 * How many tickets of a server list (useServerList result, or undefined to skip) are still open — not Resolved /
 * Closed: the same search, filters and dates as the list plus ?open=true, fetched with limit=1 so only the
 * pagination total matters.
 */
import { useListQuery } from '../../app/api'

export function useOpenCount(L) {
  const query = { page: 1, limit: 1, open: 'true' }
  if (L) {
    const p = L.params
    Object.assign(query, { search: p.search.trim(), from: p.from, to: p.to })
    for (const [k, v] of Object.entries(p.filters)) if (v !== '' && v !== undefined && v !== null) query[k] = v
    query.open = 'true'
  }
  const { data } = useListQuery({ resource: 'tickets', params: query }, { skip: !L, refetchOnMountOrArgChange: 30 })
  return data?.pagination?.total ?? 0
}
