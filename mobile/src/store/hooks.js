/* Use these instead of importing useDispatch / useSelector directly. */
import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

import { useEffect, useMemo, useState } from 'react';
import { useListQuery } from './api';

/** A paged, searchable server list. Returns { items, total, page, hasMore, loadMore, search, setSearch, isLoading, isFetching, error, refetch }. */
export function useList(resource, filters = {}, { limit = 20, sort, order } = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [acc, setAcc] = useState({ key: '', items: [] });
  const key = JSON.stringify([resource, filters, search, sort, order]);
  const params = { page, limit, ...(search ? { search } : {}), ...(sort ? { sort, order: order || 'asc' } : {}), ...filters };
  const q = useListQuery({ resource, params });
  // pages accumulate while the key (filters/search) stays the same; a new key starts again from page 1
  useEffect(() => {
    if (!q.data) return;
    const fresh = q.data.data || [];
    setAcc(prev => ({ key, items: page === 1 || prev.key !== key ? fresh : [...prev.items.filter(x => !fresh.some(y => y.id === x.id)), ...fresh] }));
  }, [q.data, key, page]);
  const items = acc.key === key ? acc.items : [];
  const pg = q.data?.pagination;
  return {
    items, total: pg?.total ?? 0, page, hasMore: !!pg?.hasNext, message: q.data?.message,
    loadMore: () => { if (pg?.hasNext && !q.isFetching) setPage(p => p + 1); },
    search, setSearch: v => { setSearch(v); setPage(1); },
    isLoading: q.isLoading || (q.isFetching && acc.key !== key), isFetching: q.isFetching, error: q.error, refetch: () => { setPage(1); q.refetch(); },
  };
}

/** Small lookup maps for names: useLookup('properties') → { byId, name(id) }. Loads up to 100 records once and caches. */
export function useLookup(resource) {
  const q = useListQuery({ resource, params: { limit: 100 } });
  return useMemo(() => {
    const byId = Object.fromEntries((q.data?.data || []).map(r => [r.id, r]));
    return { byId, list: q.data?.data || [], name: id => byId[id]?.name || '', isLoading: q.isLoading };
  }, [q.data, q.isLoading]);
}
