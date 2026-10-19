/* Sign-up 7 of 7: review what was entered, agree, upload the documents and create the (pending) account
   (POST /auth/register with the signup token from the email confirmation). */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../../theme';
import { StepFrame, Checkbox, AppText, KeyValueRow, Icon } from '../../../components';
import { SIGNUP_STEPS, setSignup } from '../../../store/slices/signupSlice';
import { useRegisterMutation, errorMessage } from '../../../store/api';
import { uploadAsset } from '../../../store/uploads';
import { useSignup } from './useSignup';

export default function PasswordScreen() {
  const nav = useNavigation();
  const { f, set, errors, check, dispatch } = useSignup();
  const [register] = useRegisterMutation();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [serverErr, setServerErr] = useState('');
  const next = async () => {
    if (!check({ agree: !f.agree && 'Please agree to continue.' })) return;
    if (!f.signupToken) { setServerErr('Your email confirmation has expired. Go back to the first step and send the code again.'); return; }
    setBusy(true); setServerErr('');
    try {
      // documents go up first, with the sign-up token (there is no account yet)
      const up = async (file, label) => { if (!file || !file.uri) return undefined; setStep(`Uploading ${label}…`); const a = await uploadAsset(file, undefined, f.signupToken); return a.id; };
      const [panFile, gstFile, chequeFile, poaFile] = [await up(f.panFile, 'PAN card'), await up(f.gstFile, 'GST certificate'), await up(f.chequeFile, 'cheque'), await up(f.poaFile, 'document')];
      setStep('Creating your account…');
      const owner = {
        name: f.name.trim(), kind: f.kind, phone: f.phone.trim(), phone2: f.altPhone?.trim() || '', whatsapp: f.whatsappSame ? f.phone.trim() : (f.whatsapp || '').trim(), prefContact: f.prefContact, callHours: f.callHours,
        addr: { line: f.addrLine.trim(), city: f.addrCity.trim(), state: f.addrState, pin: f.addrPin.trim() }, noticeSame: !!f.noticeSame,
        noticeAddr: f.noticeSame ? undefined : { line: f.nLine, city: f.nCity, state: f.nState, pin: f.nPin, attn: f.nAttn }, noticeEmail: f.noticeEmail,
        pan: f.pan.trim().toUpperCase(), panName: (f.panName || f.name).trim(), gstin: (f.gstin || '').trim().toUpperCase(), panFile, gstFile,
        bankName: f.bankName, bankBranch: f.bankBranch, ifsc: f.ifsc.trim().toUpperCase(), acctHolder: (f.acctHolder || f.panName || f.name).trim(), acctNo: f.acctNo.trim(), acctType: f.acctType, upi: f.upi, chequeFile,
        coOwners: f.coOwners, rep: f.repName ? { name: f.repName, rel: f.repRel, phone: f.repPhone, email: f.repEmail } : undefined, poaFile,
      };
      const r = await register({ signupToken: f.signupToken, password: f.password, owner, property: { code: f.propertyCode.trim(), name: f.propertyName.trim(), town: f.propertyTown.trim() }, source: 'app' }).unwrap();
      dispatch(setSignup({ status: 'pending', message: r.message }));
      nav.navigate('SignUpPending');
    } catch (e) { setServerErr(e.message && !e.status ? e.message : errorMessage(e)); } finally { setBusy(false); setStep(''); }
  };
  const mask = v => (v ? '•••• ' + v.slice(-4) : '');
  const review = [
    ['Email', f.email], ['Mobile', `+91 ${f.phone}`], ['Name', f.name], ['Type', f.kind],
    ['Address', `${f.addrCity}, ${f.addrState} ${f.addrPin}`], ['PAN', f.pan], ['GSTIN', f.gstin || 'Not registered'],
    ['Bank', `${f.bankName}, ${mask(f.acctNo)}`], ['Property', f.propertyCode || `${f.propertyName}, ${f.propertyTown}`],
  ];
  return (
    <StepFrame step={7} steps={SIGNUP_STEPS} title="Check and create" nextTitle="Create account" onNext={next} nextLoading={busy} hint={serverErr || step || undefined}>
      <View style={styles.review}>
        {review.map(([l, v], i) => <KeyValueRow key={l} label={l} value={v} mono={false} divider={i < review.length - 1} />)}
      </View>
      <AppText variant="small" color="muted" style={styles.edit}>Go back to any step to change something.</AppText>
      <Checkbox checked={f.agree} onChange={set('agree')} label="The details are correct and my PAN and bank account may be verified." />
      {errors.agree ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{errors.agree}</AppText> : null}
      {serverErr ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{serverErr}</AppText> : null}
      <View style={styles.note}><Icon name="lock" size={18} color={colors.muted} /><AppText variant="small" color="muted" style={styles.flex}>Your account is ready to use after the facilities team checks these details and links your property. Usually one working day.</AppText></View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ review: { backgroundColor: colors.sunk, borderRadius: ms(18), paddingHorizontal: s(16) }, edit: { marginTop: vs(10), marginBottom: vs(20) }, field: { marginBottom: vs(18) }, err: { marginTop: vs(8) }, note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start', marginTop: vs(20) }, flex: { flex: 1 } });
