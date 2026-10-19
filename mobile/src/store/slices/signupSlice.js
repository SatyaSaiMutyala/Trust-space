/* Owner self sign-up: every field needed to create an owner (same as the web owner form), kept across the steps.
   On submit the account is created as "pending" until the facilities team verifies PAN and bank and links the property. */
import { createSlice } from '@reduxjs/toolkit';

export const SIGNUP_STEPS = 7;

const initialState = {
  // 1 sign-in details
  email: '', password: '', password2: '', emailVerified: false, signupToken: '', devCode: '',
  // 2 about you
  kind: 'Individual', name: '', phone: '', whatsappSame: true, whatsapp: '', altPhone: '', prefContact: 'WhatsApp', callHours: 'Morning, 9–12',
  // 3 address
  addrLine: '', addrCity: '', addrState: 'Telangana', addrPin: '', noticeSame: true, nAttn: '', nLine: '', nCity: '', nState: 'Telangana', nPin: '', noticeEmail: '',
  // 4 PAN and GST
  pan: '', panName: '', panFile: null, gstin: '', gstFile: null,
  // 5 bank
  bankName: '', bankBranch: '', ifsc: '', acctHolder: '', acctNo: '', acctNo2: '', acctType: 'Savings', upi: '', chequeFile: null,
  // 6 property and people
  propertyCode: '', propertyName: '', propertyTown: '', coOwners: '', repName: '', repRel: '', repPhone: '', repEmail: '', poaFile: null,
  // 7 consent
  agree: false,
  status: 'draft', // draft | submitting | pending
  message: '', // the server's reply after submit
};

const signupSlice = createSlice({
  name: 'signup',
  initialState,
  reducers: {
    setSignup(state, { payload }) { Object.assign(state, payload); },
    resetSignup() { return initialState; },
  },
});

export const { setSignup, resetSignup } = signupSlice.actions;
export default signupSlice.reducer;
