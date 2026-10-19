/* Push notifications (Firebase Cloud Messaging).
   - After sign-in: ask permission, get the device token, register it (POST /mobile/push-token); re-register when
     Firebase rotates it. Before sign-out the token is removed (DELETE /mobile/push-token), see authSlice.
   - A tap on a notification opens the screen it is about: every push carries a `link` (truspace://…), and the app's
     deep-link routing (navigation/linking.js) takes it from there — from the background or from a cold start.
   - In the foreground the notification is shown as an in-app banner (see <PushBanner> in App.js) and the screens that
     could have changed refresh their data. */
import { AppState, Linking, Platform } from 'react-native';
import { getMessaging, AuthorizationStatus, requestPermission, getToken, onTokenRefresh, onMessage, onNotificationOpenedApp, getInitialNotification, isDeviceRegisteredForRemoteMessages, registerDeviceForRemoteMessages } from '@react-native-firebase/messaging'; // v26 has only the modular API
import { store } from './index';
import { api } from './api';
import { setPushBanner } from './slices/uiSlice';
import { navigationRef } from '../navigation/linking';
import { setCurrentPushToken } from './pushToken';

let started = false, registeredFor = '';
const fcm = () => getMessaging();
const log = (...a) => { if (__DEV__) console.log('[push]', ...a); };

async function register() {
  const st = store.getState();
  if (st.auth.status !== 'signedIn') return;
  try {
    const perm = await requestPermission(fcm());
    const allowed = perm === AuthorizationStatus.AUTHORIZED || perm === AuthorizationStatus.PROVISIONAL;
    if (!allowed) { log('permission not granted'); return; }
    if (Platform.OS === 'ios' && !isDeviceRegisteredForRemoteMessages(fcm())) await registerDeviceForRemoteMessages(fcm());
    const token = await getToken(fcm());
    if (!token) return;
    setCurrentPushToken(token);
    const key = `${st.auth.user?.id}|${token}`;
    if (registeredFor === key) return;
    await store.dispatch(api.endpoints.registerPushToken.initiate({ token, platform: Platform.OS })).unwrap();
    registeredFor = key; log('token registered');
  } catch (e) { log('register failed', e.message); }
}

/** Open the screen a notification points at. Waits for navigation to be ready on a cold start. */
export function openLink(link) {
  if (!link || typeof link !== 'string') return;
  const go = () => Linking.openURL(link).catch(e => log('open failed', e.message));
  if (navigationRef.isReady()) go(); else setTimeout(() => openLink(link), 300);
}

/** Refresh whatever a notification (or live event) may have changed. */
export const refreshFor = tag => {
  const tags = ['Notifications', 'Overview', 'Threads'];
  if (/^thread/.test(tag)) tags.push({ type: 'List', id: 'messages' });
  if (/invoice/.test(tag)) tags.push({ type: 'List', id: 'invoices' });
  if (/^ticket/.test(tag)) tags.push({ type: 'List', id: 'tickets' });
  if (/^insp/.test(tag)) tags.push('Inspections', { type: 'List', id: 'inspections' });
  if (/^dep/.test(tag)) tags.push({ type: 'List', id: 'leases' });
  store.dispatch(api.util.invalidateTags(tags));
};

/** Call once at app start (App.js). */
export function startPush() {
  if (started) return; started = true;
  // register once signed in, and again whenever the account changes
  let last = '';
  store.subscribe(() => { const a = store.getState().auth; const k = a.status === 'signedIn' ? a.user?.id || '' : ''; if (k !== last) { last = k; if (k) register(); else registeredFor = ''; } });
  onTokenRefresh(fcm(), () => { registeredFor = ''; register(); });
  // foreground: in-app banner + refresh
  onMessage(fcm(), async m => {
    const n = m.notification || {}; const d = m.data || {};
    refreshFor(d.tag || '');
    store.dispatch(setPushBanner({ title: n.title || d.title || 'TruSpace', body: n.body || d.body || '', link: d.link || '', at: Date.now() }));
  });
  // background: tapped
  onNotificationOpenedApp(fcm(), m => { refreshFor(m?.data?.tag || ''); openLink(m?.data?.link); });
  // quit: tapped, the app starts because of it
  getInitialNotification(fcm()).then(m => { if (m) { refreshFor(m?.data?.tag || ''); openLink(m?.data?.link); } }).catch(() => {});
  // coming back to the foreground: the data may be stale
  AppState.addEventListener('change', s => { if (s === 'active') store.dispatch(api.util.invalidateTags(['Notifications', 'Threads'])); });
}
