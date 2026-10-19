/* Offline work on inspections. Every edit made on an inspection screen is written here first, as one small operation,
   then replayed to the server in order (see store/offline.js). While an op waits, the screens show it as if saved.
     queue: [{ opId, inspId, type: 'item' | 'patch' | 'photos' | 'video', k?, body?, files?, at }]
     cache: { [inspId]: the last server view of that inspection, so it opens without a connection }
   Both are persisted on the phone (AsyncStorage) and restored at start. */
import { createSlice } from '@reduxjs/toolkit';

const initialState = { queue: [], cache: {}, syncing: false, lastError: '', hydrated: false };

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    hydrated(state, { payload }) { state.queue = payload?.queue || []; state.cache = payload?.cache || {}; state.hydrated = true; },
    enqueue(state, { payload }) {
      const byId = state.queue.find(o => o.opId === payload.opId);
      if (byId) { Object.assign(byId, payload); return; } // progress update of an op already queued (uploads done so far)
      // two field edits of the same item/record collapse into one op, so a flaky connection does not replay a dozen taps
      const same = payload.type !== 'photos' && payload.type !== 'video' ? state.queue.find(o => o.inspId === payload.inspId && o.type === payload.type && o.k === payload.k) : null;
      if (same) same.body = { ...same.body, ...payload.body }; else state.queue.push(payload);
      state.lastError = '';
    },
    dequeue(state, { payload }) { state.queue = state.queue.filter(o => o.opId !== payload); },
    dropForInspection(state, { payload }) { state.queue = state.queue.filter(o => o.inspId !== payload); },
    cacheView(state, { payload }) { state.cache[payload.id] = payload.view; },
    forgetView(state, { payload }) { delete state.cache[payload]; },
    setSyncing(state, { payload }) { state.syncing = !!payload; },
    setLastError(state, { payload }) { state.lastError = payload || ''; },
  },
});

export const { hydrated, enqueue, dequeue, dropForInspection, cacheView, forgetView, setSyncing, setLastError } = offlineSlice.actions;
export default offlineSlice.reducer;

/** Pending counts for banners: { changes, photos } over the whole queue (or one inspection). */
export const pendingOf = (state, inspId) => {
  const q = state.offline.queue.filter(o => !inspId || o.inspId === inspId);
  const files = q.reduce((a, o) => a + (o.files ? o.files.length : 0), 0);
  return { changes: q.length - q.filter(o => o.files && o.files.length).length, photos: files, total: q.length };
};
