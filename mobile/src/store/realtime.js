/* Live updates over Socket.IO while the app is open: new messages appear in the open conversation at once, typing
   shows under the header, and any change that concerns the user refreshes the lists on screen. Connected only while
   signed in; reconnects on its own and picks up a renewed access token. Push notifications still cover the
   background and closed states (store/push.js). */
import { io } from 'socket.io-client';
import { API_URL } from '../config/env';
import { store } from './index';
import { api } from './api';
import { setTyping } from './slices/uiSlice';
import { refreshFor } from './push';

const BASE = API_URL.replace(/\/api\/?$/, '');
let socket = null, started = false, current = '', typingAt = 0;
const log = (...a) => { if (__DEV__) console.log('[live]', ...a); };

function wire(s) {
  s.on('connect', () => { log('connected'); if (current) s.emit('thread:join', current); });
  s.on('connect_error', async e => {
    if (/unauthorized/i.test(e.message)) {
      // the access token expired: any API call renews it through the refresh cookie, then the next attempt uses the new one
      try { await store.dispatch(api.endpoints.me.initiate(undefined, { forceRefetch: true })).unwrap(); } catch (err) { /* signed out: sync() disconnects */ }
    }
  });
  s.on('message:new', m => {
    if (!m || !m.propertyId) return;
    store.dispatch(api.util.updateQueryData('thread', { propertyId: m.propertyId }, draft => { const list = draft?.data?.messages; if (list && !list.some(x => x.id === m.id)) list.push(m); }));
    store.dispatch(api.util.invalidateTags(['Threads']));
  });
  s.on('notify', n => refreshFor(n?.tag || ''));
  s.on('record:changed', r => refreshFor(r?.path === 'messages' ? 'thread' : r?.path === 'invoices' ? 'invoice' : r?.path === 'tickets' ? 'ticket' : r?.path === 'inspections' ? 'insp' : r?.path === 'leases' ? 'dep' : ''));
  s.on('typing', t => { if (t && t.propertyId) store.dispatch(setTyping({ propertyId: t.propertyId, by: t.by, at: Date.now() })); });
}

function sync() {
  const st = store.getState();
  if (st.auth.status === 'signedIn') {
    if (socket) return;
    socket = io(BASE, { path: '/socket.io', transports: ['websocket'], auth: cb => cb({ token: store.getState().auth.accessToken }), reconnectionDelayMax: 10000 });
    wire(socket);
  } else if (socket) { socket.disconnect(); socket = null; current = ''; }
}

/** Call once at app start. */
export function startRealtime() { if (started) return; started = true; store.subscribe(sync); sync(); }
/** The conversation on screen: join its room (instant messages, typing) and leave it when closed. */
export function joinThread(propertyId) { current = propertyId || ''; if (socket && socket.connected && propertyId) socket.emit('thread:join', propertyId); }
export function leaveThread(propertyId) { if (current === propertyId) current = ''; if (socket && socket.connected && propertyId) socket.emit('thread:leave', propertyId); }
/** Tell the others in the conversation that this person is typing (at most every 1.5 s). */
export function sendTyping(propertyId) { const now = Date.now(); if (!socket || !socket.connected || now - typingAt < 1500) return; typingAt = now; socket.emit('typing', propertyId); }
