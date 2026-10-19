/* One inspection for the phone screens: the server's view (GET /mobile/inspections/:id), kept on the phone, with the
   changes still waiting in the offline queue applied on top — so what the inspector just recorded shows at once, with
   or without a connection. Edits go through queueOp (store/offline.js); sign-off actions need a connection. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { useInspectionQuery, useInspectionActionMutation, usePatchInspectionMutation, errorMessage } from './api';
import { cacheView } from './slices/offlineSlice';
import { queueOp } from './offline';
import { BADC, inspProblems, inspProgress, inspSteps, inspSummary, INSP_SECTIONS, FIX_SEC } from '../../../shared/calc/inspection.js';

/** Apply queued ops to a server view and recompute everything derived from the items. */
export function applyQueued(view, ops) {
  if (!view || !ops.length) return view;
  const I = { ...view.inspection, items: view.inspection.items.map(it => ({ ...it, photos: [...(it.photos || [])] })), roomPhotos: [...(view.inspection.roomPhotos || [])] };
  const local = f => ({ id: null, local: true, uri: f.uri, type: f.type, name: f.name });
  for (const op of ops) {
    if (op.type === 'item') { const it = I.items.find(x => x.k === op.k); if (it) { Object.assign(it, op.body); if (!BADC(it.cond)) { delete it.resp; delete it.deduct; } } }
    else if (op.type === 'patch') { for (const k of ['date', 'inspector', 'ownerRep', 'present']) if (op.body[k] !== undefined) I[k] = op.body[k]; }
    else if (op.type === 'photos') { const files = op.files.map(local); if (op.k === '__room') I.roomPhotos.push(...files); else { const it = I.items.find(x => x.k === op.k); if (it) it.photos.push(...files); } }
    else if (op.type === 'video') { const f = op.files[0]; I[op.who === 'owner' ? 'ownerVideo' : 'tdplVideo'] = { ...local(f), dur: f.duration || 0, size: f.size || 0, pending: true }; }
  }
  if (I.status === 'Not started' && (I.date || I.items.some(it => it.cond || String(it.val ?? '').trim() || it.photos.length) || I.roomPhotos.length)) I.status = 'In progress';
  const tenant = view.property?.managedBy === 'franchise' ? 'Franchise partner' : 'TrustLab';
  const sections = INSP_SECTIONS.map(s => { const items = I.items.filter(it => it.sec === s); return { s, items, done: inspProgress({ items }).done, total: items.length }; }).filter(x => x.total || x.s === FIX_SEC);
  const problems = inspProblems(I, { tenant }).map(([k, m]) => [k, m.replace(/^TrustLab inspector/, 'Facilities inspector')]);
  return { ...view, inspection: I, sections, progress: inspProgress(I), steps: inspSteps(I), problems, summary: inspSummary(I), canSubmit: view.canEdit && !problems.length && ['Not started', 'In progress', 'Disputed'].includes(I.status) };
}

export function useInspection(id) {
  const dispatch = useAppDispatch();
  const q = useInspectionQuery(id, { skip: !id });
  const cached = useAppSelector(st => st.offline.cache[id]);
  const queue = useAppSelector(st => st.offline.queue);
  const ops = useMemo(() => queue.filter(o => o.inspId === id), [queue, id]);
  const offline = useAppSelector(st => st.ui.offline);
  const [act, actState] = useInspectionActionMutation();
  const [patchNow] = usePatchInspectionMutation();
  const server = q.data?.data;
  useEffect(() => { if (server && !ops.length) dispatch(cacheView({ id, view: server })); }, [server, id, ops.length, dispatch]);
  const base = server || cached || null;
  const view = useMemo(() => applyQueued(base, ops), [base, ops]);
  const debounce = useRef({});
  const saveItem = useCallback((k, body) => queueOp({ inspId: id, type: 'item', k, body }), [id]);
  const addPhotos = useCallback((k, files) => { if (files && files.length) queueOp({ inspId: id, type: 'photos', k, files: files.map(f => ({ uri: f.uri, type: f.type, name: f.name, size: f.size })) }); }, [id]);
  /** Header fields: typed values are sent 600 ms after the last keystroke, one op per field. */
  const saveField = useCallback((key, value) => { clearTimeout(debounce.current[key]); debounce.current[key] = setTimeout(() => queueOp({ inspId: id, type: 'patch', k: key, body: { [key]: value } }), 600); }, [id]);
  const setVideo = useCallback((who, file) => queueOp({ inspId: id, type: 'video', k: who, who, files: [{ uri: file.uri, type: file.type, name: file.name, size: file.size, duration: file.duration }] }), [id]);
  const action = useCallback(async (name, body) => { const r = await act({ id, action: name, body }).unwrap(); if (r?.data?.inspection) dispatch(cacheView({ id, view: r.data })); return r; }, [act, id, dispatch]);
  const addFixture = useCallback(async (label, qty) => patchNow({ id, body: { addFixture: { label, qty } } }).unwrap(), [patchNow, id]);
  return {
    view, inspection: view?.inspection || null, isLoading: q.isLoading && !cached, isFetching: q.isFetching, error: q.error && !base ? errorMessage(q.error) : '', refetch: q.refetch,
    pending: ops.length, offline, saveItem, addPhotos, saveField, setVideo, addFixture, action, acting: actState.isLoading,
  };
}

/** The item after `k` in the same section that is not recorded yet (or the next one at all), for "Save, next item". */
export function nextItemKey(view, k) {
  if (!view) return null;
  const sec = view.sections.find(s => s.items.some(it => it.k === k));
  if (!sec) return null;
  const i = sec.items.findIndex(it => it.k === k);
  const after = sec.items.slice(i + 1);
  const todo = after.find(it => !(it.type === 'count' || it.type === 'reading' ? String(it.val ?? '').trim() : it.cond));
  return (todo || after[0] || null)?.k || null;
}
