/* Redux Toolkit store. Add a slice in ./slices and register it here. */
import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';

export const store = configureStore({
  reducer: { auth },
});
