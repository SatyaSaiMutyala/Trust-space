/* Redux Toolkit store. Add a slice in ./slices and register it here. */
import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import ui from './slices/uiSlice';
import signup from './slices/signupSlice';

export const store = configureStore({
  reducer: { auth, ui, signup },
});
