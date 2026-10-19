/* App-wide UI state: connectivity (drives the offline banner; set by failed requests and cleared by the next success), toast. */
import { createSlice } from '@reduxjs/toolkit';

const initialState = { offline: false, toast: null, notice: null, pushBanner: null, typing: null }; // typing: { propertyId, by, at } from the live connection // pushBanner: a notification received while the app is open // notice: shown on the sign-in screen once (e.g. after deleting the account)

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOffline(state, { payload }) { state.offline = !!payload; },
    showToast(state, { payload }) { state.toast = payload; },
    hideToast(state) { state.toast = null; },
    setNotice(state, { payload }) { state.notice = payload; },
    clearNotice(state) { state.notice = null; },
    setPushBanner(state, { payload }) { state.pushBanner = payload; },
    clearPushBanner(state) { state.pushBanner = null; },
    setTyping(state, { payload }) { state.typing = payload; },
    clearTyping(state) { state.typing = null; },
  },
});

export const { setOffline, showToast, hideToast, setNotice, clearNotice, setPushBanner, clearPushBanner, setTyping, clearTyping } = uiSlice.actions;
export default uiSlice.reducer;
