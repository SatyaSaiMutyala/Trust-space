/* Redux Toolkit store: auth, ui, sign-up form state and the RTK Query API cache. */
import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import ui from './slices/uiSlice';
import signup from './slices/signupSlice';
import offline from './slices/offlineSlice';
import { api } from './api';

export const store = configureStore({
  reducer: { auth, ui, signup, offline, [api.reducerPath]: api.reducer },
  middleware: gdm => gdm().concat(api.middleware),
});
