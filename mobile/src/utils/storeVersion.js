/* The version of this app currently live in the stores, read from the stores themselves (no server setting):
     Android  the public Play Store listing page, matched like react-native-version-check does
     iOS      the public App Store lookup API, by bundle id (works for listed apps)
   Both return null when they can't tell, so the caller never blocks the user by mistake. */
import { ANDROID_PACKAGE_ID, IOS_BUNDLE_ID } from '../config/appVersion';

const TIMEOUT = 8000;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** { version, url } of the live Play Store build, or null. */
export async function fetchPlayStoreVersion() {
  const url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}&hl=en&gl=US`;
  const res = await withTimeout(fetch(url, { headers: { 'sec-fetch-site': 'same-origin', 'accept-language': 'en' } }), TIMEOUT);
  if (!res.ok) return null;
  const text = await res.text();
  const m = text.match(/Current Version.+?>([\d.-]+)<\/span>/) || text.match(/\[\[\["([\d.]+?)"\]\]/);
  return m ? { version: m[1].trim(), url } : null;
}

/** { version, url } of the live App Store build, or null (also null while the app is not yet listed). */
export async function fetchAppStoreVersion() {
  const res = await withTimeout(fetch(`https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(IOS_BUNDLE_ID)}&country=in&t=${Date.now()}`), TIMEOUT);
  if (!res.ok) return null;
  const json = await res.json();
  const app = json && json.results && json.results[0];
  return app && app.version ? { version: String(app.version).trim(), url: app.trackViewUrl || `https://apps.apple.com/app/id${app.trackId}`, id: app.trackId } : null;
}

/** true when a is a newer dotted version than b ('1.10' > '1.9'). */
export function isNewer(a, b) {
  const pa = String(a || '').split('.').map(x => parseInt(x, 10) || 0), pb = String(b || '').split('.').map(x => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) { const x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x > y; }
  return false;
}
