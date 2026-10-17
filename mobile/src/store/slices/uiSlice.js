/* App-wide UI state: connectivity (drives the offline banner), pending sync counts, toast. */
import { createSlice } from '@reduxjs/toolkit';

const initialState = { offline: false, pendingChanges: 14, pendingPhotos: 5, toast: null, notice: null }; // notice: shown on the sign-in screen once (e.g. after deleting the account)

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOffline(state, { payload }) { state.offline = !!payload; },
    showToast(state, { payload }) { state.toast = payload; },
    hideToast(state) { state.toast = null; },
    setNotice(state, { payload }) { state.notice = payload; },
    clearNotice(state) { state.notice = null; },
  },
});

export const { setOffline, showToast, hideToast, setNotice, clearNotice } = uiSlice.actions;
export default uiSlice.reducer;
