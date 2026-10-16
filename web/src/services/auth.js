/*
 * Sign-in for the web app, through the API (/api/auth/*, see backend/API.md) with Redux Toolkit.
 * Every function resolves the API's { message, data } or throws an Error carrying the API's message.
 */
import { UI, APP, emit } from '../store/store'
import { dispatch, callApi } from '../app/store'
import { credentialsReceived, signedOut, entitiesCleared } from '../app/slices'
import { loadPortfolio } from '../app/bootstrap'
import { api } from '../app/api'

/** Sample accounts created by the backend seed (development only — shown as one-click buttons on the login page). */
export const DEMO_PASSWORD = 'Trust@1234'
export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@trustlab.example', name: 'TrustLab' },
  { label: 'TrustLab staff', email: 'facilities@trustlab.example', name: 'Facilities' },
  { label: 'Owner', email: 'sr.kondapalli@example.com', name: 'Srinivasa' },
  { label: 'Franchise partner', email: 'medpoint@example.com', name: 'MedPoint' },
]

/** Land each role on its home page with a clean view state. */
function resetView(user) {
  UI.sel = null; UI.filt = {}; UI.conv = null; UI.convOpen = false; APP.drawer = null; APP.sheet = false
  UI.route = user?.role === 'owner' ? 'o-home' : user?.role === 'franchisee' ? 'sites' : 'overview'
  emit()
}

async function startSession(data) {
  dispatch(credentialsReceived(data))
  resetView(data.user)
  await dispatch(loadPortfolio())
}

export async function signIn({ login, password, remember }) {
  const res = await callApi('login', { login, password, remember: !!remember })
  await startSession(res.data)
  return res
}

/** On page load: continue the session from the refresh cookie, if there is one. */
export async function restoreSession() {
  try {
    const res = await callApi('refresh')
    await startSession(res.data)
  } catch {
    dispatch(signedOut())
  }
}

export const forgotPassword = login => callApi('forgotPassword', { login })
export const resetPassword = (token, password) => callApi('resetPassword', { token, password })
export async function changePassword(currentPassword, newPassword) {
  const res = await callApi('changePassword', { currentPassword, newPassword })
  dispatch(credentialsReceived(res.data))
  return res
}

export async function signOut() {
  let res = null
  try { res = await callApi('logout') } catch { /* signed out locally anyway */ }
  dispatch(signedOut())
  dispatch(entitiesCleared())
  dispatch(api.util.resetApiState())
  resetView(null)
  return res
}

/** Same rules as the API, to give instant feedback while typing a new password. */
export function passwordProblem(p) {
  if (!p) return 'Enter a password.'
  if (p.length < 8) return 'Use at least 8 characters for the password.'
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use at least one letter and one number in the password.'
  return null
}

/**
 * Development only: sign in without the form (used by the ?route=… screenshot hooks).
 * role: 'tdpl' (admin, default), 'staff', an owner id ('o1') or 'fr:<partnerId>' — resolved to the seeded account.
 */
const DEV_EMAIL = {
  tdpl: 'admin@trustlab.example', staff: 'facilities@trustlab.example', o1: 'sr.kondapalli@example.com', o2: 'accounts@meridian.example.com', o3: 'ln.pydi@example.com', o4: 'padma.g@example.com',
  o5: 'vgupta.m@example.com', o6: 'saikrupa@example.com', o7: 'ch.nrao@example.com', o8: 'sravani.pydi@example.com', 'fr:pa1': 'srisai@example.com', 'fr:pa2': 'medpoint@example.com',
}
export async function devSignIn(role) {
  try { await signIn({ login: DEV_EMAIL[role || 'tdpl'] || DEV_EMAIL.tdpl, password: DEMO_PASSWORD }) }
  catch (e) { console.error('Dev sign-in failed:', e.message) }
}
