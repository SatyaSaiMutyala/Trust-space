/* Signed-in user and tokens. Filled in when the sign-in screen and API are wired up. Roles: admin, staff, owner, franchisee. */
import { createSlice } from '@reduxjs/toolkit';

const initialState = { status: 'signedOut', user: null, accessToken: null }; // status: checking | signedOut | signedIn

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, { payload }) {
      state.status = 'signedIn';
      state.user = payload.user;
      state.accessToken = payload.accessToken;
    },
    signedOut() {
      return initialState;
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export default authSlice.reducer;
