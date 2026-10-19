/* Signed-in user and access token. status: checking (restoring the session at start) | signedOut | signedIn.
   The role drives which tabs you see: admin and staff share the staff app; owner; franchise (server role "franchisee").
   The refresh token lives in the native cookie store (httpOnly cookie from the server), so a restart only needs
   POST /auth/refresh to get a new access token. */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config/env';
import { getCurrentPushToken } from '../pushToken';

export const roleOf = user => (user?.role === 'franchisee' ? 'franchise' : user?.role === 'owner' ? 'owner' : 'staff');
export const initialsOf = name => String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const initialState = { status: 'checking', user: null, role: null, accessToken: null, mediaToken: null, remember: true };

async function post(path, body, token) {
  const res = await fetch(API_URL + path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.message || 'Something went wrong.'); e.status = res.status; e.code = json.code; throw e; }
  return json;
}

/** Sign in with email or mobile and password. Resolves with { user, accessToken } or rejects with the server's message. */
export const signIn = createAsyncThunk('auth/signIn', async ({ login, password, remember }, { rejectWithValue }) => {
  try {
    const r = await post('/auth/login', { login, password, remember: !!remember });
    return { user: r.data.user, accessToken: r.data.accessToken, mediaToken: r.data.mediaToken, remember: !!remember };
  } catch (e) {
    if (e.message === 'Network request failed' || e.name === 'TypeError') return rejectWithValue('Could not reach the server. Check your connection and try again.');
    return rejectWithValue(e.message);
  }
});

/** On app start: renew the access token from the refresh cookie, if there is one. */
export const restoreSession = createAsyncThunk('auth/restore', async (_, { rejectWithValue }) => {
  try { const r = await post('/auth/refresh'); return { user: r.data.user, accessToken: r.data.accessToken, mediaToken: r.data.mediaToken }; } catch (e) { return rejectWithValue(e.message); }
});

/** Sign out everywhere this session is known (best effort), then clear local state. */
export const signOut = createAsyncThunk('auth/signOut', async (_, { getState }) => {
  const token = getState().auth.accessToken; const push = getCurrentPushToken();
  if (push) { try { await fetch(API_URL + '/mobile/push-token', { method: 'DELETE', credentials: 'include', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ token: push }) }); } catch (e) { /* offline: the server drops the token when it fails to deliver */ } }
  try { await post('/auth/logout', undefined, token); } catch (e) { /* already signed out or offline: clear locally anyway */ }
});

const applyUser = (state, user, accessToken, mediaToken) => {
  if (mediaToken) state.mediaToken = mediaToken;
  state.status = 'signedIn';
  state.user = user ? { ...user, initials: initialsOf(user.name), team: user.role === 'admin' ? 'Admin' : user.role === 'staff' ? 'Facilities' : undefined } : state.user;
  state.role = roleOf(state.user);
  state.accessToken = accessToken;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, { payload }) { applyUser(state, payload.user, payload.accessToken, payload.mediaToken); },
    setRemember(state, { payload }) { state.remember = !!payload; },
    signedOut() { return { ...initialState, status: 'signedOut' }; },
  },
  extraReducers: b => {
    b.addCase(signIn.fulfilled, (state, { payload }) => { applyUser(state, payload.user, payload.accessToken, payload.mediaToken); state.remember = payload.remember; });
    b.addCase(restoreSession.fulfilled, (state, { payload }) => applyUser(state, payload.user, payload.accessToken, payload.mediaToken));
    b.addCase(restoreSession.rejected, state => { state.status = 'signedOut'; });
    b.addCase(signOut.fulfilled, () => ({ ...initialState, status: 'signedOut' }));
    b.addCase(signOut.rejected, () => ({ ...initialState, status: 'signedOut' }));
  },
});

export const { credentialsReceived, setRemember, signedOut } = authSlice.actions;
export default authSlice.reducer;
