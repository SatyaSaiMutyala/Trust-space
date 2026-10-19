/* Firebase web app config (browser push notifications). These values identify the project and are safe to ship in
   the browser bundle; access is governed by Firebase rules and the backend. The VAPID key (Cloud Messaging → Web
   configuration → Web Push certificates) is needed before the browser can register for pushes. */
export const firebaseConfig = {
  apiKey: 'AIzaSyBRAp1AFi5xik-6RFxB-YPy_egUXeY01Y8',
  authDomain: 'trustlab-diagnostics.firebaseapp.com',
  projectId: 'trustlab-diagnostics',
  storageBucket: 'trustlab-diagnostics.firebasestorage.app',
  messagingSenderId: '1097441735329',
  appId: '1:1097441735329:web:9bd8d7813dd73c5724f6e0',
}
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
