/* The device's current push token, kept outside the store so sign-out can remove it on the server without importing
   the store (which would be a circular import from authSlice). */
let current = '';
export const setCurrentPushToken = t => { current = t || ''; };
export const getCurrentPushToken = () => current;
