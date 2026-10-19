/* Blocks the app when the store has a newer version than this build. Checks once at start and every time the app
   comes back to the foreground (someone who opens the store and does not update meets the dialog again). Debug
   builds are never blocked, and any failure lets the user in. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { APP_VERSION, ANDROID_PACKAGE_ID, PLAY_STORE_URL } from '../config/appVersion';
import { fetchPlayStoreVersion, fetchAppStoreVersion, isNewer } from '../utils/storeVersion';

export default function useForceUpdate() {
  const [store, setStore] = useState(null); // { version, url } when an update is required
  const running = useRef(false);
  const check = useCallback(async () => {
    if (__DEV__ || running.current) return;
    running.current = true;
    try {
      const live = Platform.OS === 'android' ? await fetchPlayStoreVersion() : await fetchAppStoreVersion();
      if (live && isNewer(live.version, APP_VERSION)) setStore(live); else setStore(null);
    } catch (e) { /* no network or page changed: fail open */ } finally { running.current = false; }
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') check(); });
    return () => sub.remove();
  }, [check]);
  const openStore = useCallback(async () => {
    // not guarded with canOpenURL: on Android 11+ it answers false unless the scheme is declared, which would trap the user
    if (Platform.OS === 'android') { try { await Linking.openURL(`market://details?id=${ANDROID_PACKAGE_ID}`); return; } catch (e) { /* no Play app */ } await Linking.openURL(PLAY_STORE_URL).catch(() => {}); return; }
    const url = store?.url || 'https://apps.apple.com';
    try { await Linking.openURL(store?.id ? `itms-apps://apps.apple.com/app/id${store.id}` : url); } catch (e) { await Linking.openURL(url).catch(() => {}); }
  }, [store]);
  return { updateRequired: !!store, storeVersion: store?.version || '', openStore };
}
