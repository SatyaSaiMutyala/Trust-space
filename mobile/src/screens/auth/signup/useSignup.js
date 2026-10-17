/* Shared helpers for the sign-up steps: form state, setters, field validation. */
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setSignup } from '../../../store/slices/signupSlice';

export const isPhone = v => /^[6-9]\d{9}$/.test(v.replace(/\s/g, ''));
export const isEmail = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPan = v => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.toUpperCase());
export const isGstin = v => !v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase());
export const isIfsc = v => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase());
export const isPin = v => /^\d{6}$/.test(v);

export function useSignup() {
  const dispatch = useAppDispatch();
  const f = useAppSelector(st => st.signup);
  const [errors, setErrors] = useState({});
  const set = k => v => { dispatch(setSignup({ [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: undefined })); };
  /** rules: { field: message | false } — a message means the field is wrong. Returns true when everything passes. */
  const check = rules => { const e = {}; Object.entries(rules).forEach(([k, m]) => { if (m) e[k] = m; }); setErrors(e); return !Object.keys(e).length; };
  return { f, set, errors, check, dispatch };
}
