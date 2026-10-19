/* Offline sync for inspections. Screens never call the API for an edit directly: they queue an operation here
   (queueOp), which is replayed to the server in order as soon as there is a connection. The queue and the last
   server view of each inspection are kept on the phone, so an inspection can be opened and worked on with no signal.
   Replays happen when an op is queued, when the app comes to the foreground, and — only while something is waiting —
   on a short retry timer. There is no polling otherwise. */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './index';
import { api, errorMessage } from './api';
import { uploadAsset } from './uploads';
import { hydrated, enqueue, dequeue, cacheView, setSyncing, setLastError } from './slices/offlineSlice';
import { setOffline } from './slices/uiSlice';

const KEY = 'truspace.offline.v1';
const RETRY_MIN = 15000, RETRY_MAX = 120000;
let persistT = null, retryT = null, flushing = false, backoff = RETRY_MIN, started = false, lastSaved = null;

const newOpId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const isNetwork = e => e?.network || e?.status === 'FETCH_ERROR' || e?.status === 'TIMEOUT_ERROR';

async function load() {
  try { const raw = await AsyncStorage.getItem(KEY); store.dispatch(hydrated(raw ? JSON.parse(raw) : null)); }
  catch (e) { store.dispatch(hydrated(null)); }
}
function persist() {
  const off = store.getState().offline;
  if (off === lastSaved || !off.hydrated) return;
  lastSaved = off;
  clearTimeout(persistT);
  persistT = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify({ queue: off.queue, cache: off.cache })).catch(() => {}); }, 300);
}

/** Call once at app start. */
export function startOfflineSync() {
  if (started) return; started = true;
  load().then(flushQueue);
  store.subscribe(persist);
  AppState.addEventListener('change', st => { if (st === 'active') flushQueue(); });
}

/** Queue one change and try to send it now. op: { inspId, type: 'item'|'patch'|'photos'|'video', k?, body?, files?, who? } */
export function queueOp(op) {
  store.dispatch(enqueue({ opId: newOpId(), at: new Date().toISOString(), uploaded: [], ...op }));
  flushQueue();
}

function scheduleRetry() {
  clearTimeout(retryT);
  retryT = setTimeout(() => { backoff = Math.min(RETRY_MAX, backoff * 2); flushQueue(); }, backoff);
}

const mutate = (endpoint, arg) => store.dispatch(api.endpoints[endpoint].initiate(arg)).unwrap();

/** Upload the op's files that are not uploaded yet; returns every asset id in order. */
async function uploadFiles(op) {
  const ids = [...(op.uploaded || [])];
  for (let i = ids.length; i < op.files.length; i++) {
    const a = await uploadAsset(op.files[i]);
    ids.push(a.id);
    store.dispatch(enqueue({ ...op, uploaded: ids })); // progress survives a restart: the same op id is merged, not duplicated
  }
  return ids;
}

async function runOp(op) {
  if (op.type === 'item') return mutate('patchInspectionItem', { id: op.inspId, k: op.k, body: op.body });
  if (op.type === 'patch') return mutate('patchInspection', { id: op.inspId, body: op.body });
  if (op.type === 'photos') {
    const ids = await uploadFiles(op);
    return op.k === '__room' ? mutate('patchInspection', { id: op.inspId, body: { addRoomPhotos: ids } }) : mutate('patchInspectionItem', { id: op.inspId, k: op.k, body: { addPhotos: ids } });
  }
  if (op.type === 'video') {
    const ids = await uploadFiles(op); const f = op.files[0];
    return mutate('patchInspection', { id: op.inspId, body: { [op.who === 'owner' ? 'ownerVideo' : 'tdplVideo']: { id: ids[0], dur: f.duration || 0, size: f.size || 0 } } });
  }
  throw new Error('Unknown change: ' + op.type);
}

/** Replay queued ops in order. Stops at the first network failure (and retries later); server rejections drop the op and keep the message. */
export async function flushQueue() {
  if (flushing) return;
  const st = store.getState();
  if (st.auth.status !== 'signedIn' || !st.offline.hydrated) return;
  if (!st.offline.queue.length) { clearTimeout(retryT); return; }
  flushing = true; store.dispatch(setSyncing(true));
  try {
    for (const op of [...store.getState().offline.queue]) {
      try {
        const res = await runOp(op);
        store.dispatch(dequeue(op.opId));
        if (res?.data?.inspection) store.dispatch(cacheView({ id: op.inspId, view: res.data }));
        backoff = RETRY_MIN;
      } catch (e) {
        if (isNetwork(e)) { store.dispatch(setOffline(true)); scheduleRetry(); return; }
        store.dispatch(dequeue(op.opId));
        store.dispatch(setLastError(e?.data?.message || e?.message || errorMessage(e)));
      }
    }
    store.dispatch(setOffline(false));
    clearTimeout(retryT);
    store.dispatch(api.util.invalidateTags(['Inspections']));
  } finally { flushing = false; store.dispatch(setSyncing(false)); }
}
