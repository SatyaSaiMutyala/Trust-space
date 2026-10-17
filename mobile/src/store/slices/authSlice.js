/* Signed-in user. status: checking | signedOut | signedIn. role: staff | owner | franchise (admin behaves as staff).
   Until the API is wired, signIn fills a sample user for the chosen role. */
import { createSlice } from '@reduxjs/toolkit';
import { staffUser, ownerUser, franchiseUser } from '../../mock/data';

const SAMPLE = { staff: staffUser, owner: ownerUser, franchise: franchiseUser };
const initialState = { status: 'signedOut', user: null, role: null, accessToken: null, remember: true };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, { payload }) {
      state.status = 'signedIn';
      state.role = payload.role || 'staff';
      state.user = payload.user || SAMPLE[state.role];
      state.accessToken = payload.accessToken || null;
    },
    switchRole(state, { payload }) {
      state.role = payload;
      state.user = SAMPLE[payload];
    },
    setRemember(state, { payload }) { state.remember = !!payload; },
    signedOut() { return initialState; },
  },
});

export const { signedIn, signedOut, switchRole, setRemember } = authSlice.actions;
export default authSlice.reducer;
