/*
 * App state bridge. Records live in the Redux Toolkit store (app/slices.js, loaded from the API). This module keeps
 * the screens' working model: ALL = editable copies of every record the user may see, S = the current workspace's
 * scope (rescope), UI = view state. Screens change a record, then persist it with save() / remove(), which go through
 * RTK Query to the API; the API's message is shown in the snackbar. useStore() re-renders on every change.
 */
import { useSyncExternalStore } from 'react'
import { COLS } from '../domain/constants'
import { newId, nowISO } from '../domain/utils'
import { reduxStore, dispatch, getState, callApi } from '../app/store'
import { notify, recordReplaced, recordRemoved } from '../app/slices'

export const ALL = Object.fromEntries(COLS.map(c => [c, []]))
export const S = Object.fromEntries(COLS.map(c => [c, []]))
export const UI = { route: 'overview', sel: null, tab: 'summary', filt: {}, conv: null, convOpen: false, schedMode: 'month', led: null, siteMode: 'board' }
export const ME = { uid: null, canEdit: true, linked: null, resolved: false }
/** live: signed in and talking to the API; user: signed-in account; drawer/lightbox/sheet: overlays */
export const APP = { live: false, drawer: null, lightbox: null, sheet: false, user: null }

/* ---------- subscription ---------- */
let version = 0
const listeners = new Set()
export function emit() { version++; listeners.forEach(l => l()) }
const subscribe = l => { listeners.add(l); return () => listeners.delete(l) }
/** Re-render the calling component on every store change. */
export function useStore() { return useSyncExternalStore(subscribe, () => version) }

/* ---------- role & scope ---------- */
export function role() {
  if (ME.linked && ME.linked.role === 'owner') return { kind: 'owner', ownerId: ME.linked.ownerId }
  if (ME.linked && ME.linked.role === 'franchisee') return { kind: 'franchisee', partnerId: ME.linked.partnerId }
  if (ME.canEdit || (ME.linked && ME.linked.role === 'staff') || !APP.live) return { kind: 'tdpl' }
  return { kind: 'none' }
}
export const isOwner = () => role().kind === 'owner'
export const isFranchisee = () => role().kind === 'franchisee'

/* Each workspace sees its own premises: TrustLab sees TrustLab-leased premises; a franchise partner sees only the premises it manages in TruSpace; an owner sees theirs. */
export function rescope() {
  const r = role()
  if (r.kind === 'owner') { COLS.forEach(c => S[c] = ALL[c]); return }
  const mine = p => r.kind === 'franchisee' ? (p.managedBy === 'franchise' && p.partnerId === r.partnerId) : p.managedBy !== 'franchise'
  S.properties = ALL.properties.filter(mine); const ids = new Set(S.properties.map(p => p.id))
  for (const c of ['leases', 'invoices', 'tickets', 'inspections', 'messages']) S[c] = ALL[c].filter(x => ids.has(x.propertyId))
  const own = new Set(S.properties.map(p => p.ownerId))
  S.owners = r.kind === 'franchisee' ? ALL.owners.filter(o => own.has(o.id) || o.partnerId === r.partnerId) : ALL.owners.filter(o => own.has(o.id) || (!ALL.properties.some(p => p.ownerId === o.id) && !o.partnerId))
  for (const c of ['sites', 'reqs', 'partners', 'people']) S[c] = ALL[c]
}

export const prop = id => S.properties.find(p => p.id === id)
export const owner = id => S.owners.find(o => o.id === id)
export const partner = id => S.partners.find(x => x.id === id)
export const tenantOf = P => P && P.managedBy === 'franchise' ? (S.partners.find(x => x.id === P.partnerId)?.name || 'Franchise partner') : 'TrustLab Diagnostics'
export const actor = () => { const r = role(); return r.kind === 'owner' ? (owner(r.ownerId)?.name || 'Owner') : r.kind === 'franchisee' ? (partner(r.partnerId)?.name || 'Franchise partner') + ' (franchise)' : 'TrustLab Facilities' }
export const side = () => isOwner() ? 'owner' : 'tdpl'
export const frFull = r => r.kind === 'franchisee' && (partner(r.partnerId)?.premisesMgmt || ALL.properties.some(p => p.partnerId === r.partnerId))
export function scopeProps() { const r = role(); return r.kind === 'owner' ? S.properties.filter(p => p.ownerId === r.ownerId) : S.properties }
export function inScope(rec) { const ids = new Set(scopeProps().map(p => p.id)); return ids.has(rec.propertyId) }
export const frScope = () => { const r = role(); return r.kind === 'franchisee' ? new Set(S.reqs.filter(q => q.partnerId === r.partnerId).map(q => q.id)) : null }
export function unread() { const s = side(); return S.messages.filter(m => inScope(m) && m.from !== s && !(m.read || {})[s]).length }

/* ---------- toast ---------- */
/** Snackbar. API outcomes pass the server's message; severity: success | error | warning | info. */
export function toast(msg, severity = 'info') { if (msg) dispatch(notify(msg, severity)) }

/* ---------- persistence ---------- */
/** Persist a record (PUT /api/<col>/:id). The screen updates at once; if the API refuses, the change is rolled back. quiet = only report errors. */
export async function save(col, obj, quiet) {
  obj.id = obj.id || newId(); obj.updatedAt = nowISO(); if (!obj.createdAt) obj.createdAt = obj.updatedAt
  const prev = getState().entities[col].entities[obj.id]
  const sent = JSON.parse(JSON.stringify(obj))
  dispatch(recordReplaced({ col, rec: sent }))
  const isLatest = () => getState().entities[col].entities[obj.id]?.updatedAt === sent.updatedAt
  try {
    const res = await callApi('saveRecord', { resource: col, rec: sent })
    if (isLatest() && res.data) dispatch(recordReplaced({ col, rec: res.data }))
    if (!quiet) toast(res.message, 'success')
  } catch (e) {
    if (isLatest()) dispatch(prev ? recordReplaced({ col, rec: prev }) : recordRemoved({ col, id: obj.id }))
    toast(e.message, 'error')
  }
  return obj
}
/** Delete a record (DELETE /api/<col>/:id); restored if the API refuses. */
export async function remove(col, id) {
  const prev = getState().entities[col].entities[id]
  dispatch(recordRemoved({ col, id }))
  try { const res = await callApi('removeRecord', { resource: col, id }); toast(res.message, 'success') }
  catch (e) { if (prev) dispatch(recordReplaced({ col, rec: prev })); toast(e.message, 'error') }
}

/* ---------- Redux → working copies ---------- */
const seen = {}
let seenAuth = null
function syncFromRedux() {
  const st = getState(); let changed = false
  for (const c of COLS) {
    const e = st.entities[c]
    if (e !== seen[c]) { seen[c] = e; ALL[c] = e.ids.map(id => structuredClone(e.entities[id])); changed = true }
  }
  if (st.auth !== seenAuth) {
    seenAuth = st.auth
    const u = st.auth.user
    APP.user = st.auth.status === 'signedIn' ? u : null
    APP.live = st.auth.status === 'signedIn'
    ME.uid = u?.id || null
    ME.linked = !u ? null : u.role === 'owner' ? { role: 'owner', ownerId: u.ownerId } : u.role === 'franchisee' ? { role: 'franchisee', partnerId: u.partnerId } : { role: 'staff' }
    changed = true
  }
  if (changed) { rescope(); emit() }
}
reduxStore.subscribe(syncFromRedux)

/* ---------- drawer / overlays ---------- */
let drawerSeq = 0
export function openDrawer(d) { APP.drawer = Object.assign(d, { _seq: ++drawerSeq }); emit() }
export function closeDrawer() { APP.drawer = null; emit() }
/** Re-render the open drawer (React re-renders on emit; kept for parity with the prototype's drawDrawer). */
export const drawDrawer = () => emit()
export function zoom(src, vid) { APP.lightbox = { src, vid: !!vid }; emit() }
export function closeLightbox() { APP.lightbox = null; emit() }

/* ---------- navigation ---------- */
export function go(route) { UI.route = route; UI.sel = null; UI.convOpen = false; APP.sheet = false; APP.drawer = null; emit(); window.scrollTo(0, 0) }
export function openProp(id, tab) { UI.route = 'property'; UI.sel = id; UI.tab = tab || 'summary'; APP.drawer = null; emit(); window.scrollTo(0, 0) }
export function openConv(pid) { UI.route = 'messages'; UI.conv = pid; UI.convOpen = true; APP.drawer = null; emit() }
/** Merge a filter value into UI.filt[group] and re-render. */
export function setFilt(group, patch) { UI.filt[group] = Object.assign({}, UI.filt[group], patch); emit() }
