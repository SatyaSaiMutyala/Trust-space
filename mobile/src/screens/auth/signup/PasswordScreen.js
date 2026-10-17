/* Sign-up 7 of 7: review what was entered, set a password, agree, create the (pending) account. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../../theme';
import { StepFrame, Input, Checkbox, AppText, KeyValueRow, Icon } from '../../../components';
import { SIGNUP_STEPS, setSignup } from '../../../store/slices/signupSlice';
import { useSignup } from './useSignup';

export default function PasswordScreen() {
  const nav = useNavigation();
  const { f, set, errors, check, dispatch } = useSignup();
  const [busy, setBusy] = useState(false);
  const strong = f.password.length >= 8 && /\d/.test(f.password) && /[A-Za-z]/.test(f.password);
  const next = () => {
    if (!check({ password: !strong && 'At least 8 characters with a letter and a number.', password2: f.password2 !== f.password && 'The passwords do not match.', agree: !f.agree && 'Please agree to continue.' })) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); dispatch(setSignup({ status: 'pending' })); nav.navigate('SignUpPending'); }, 600); // POST /api/auth/register once the API is wired
  };
  const mask = v => (v ? '•••• ' + v.slice(-4) : '');
  const review = [
    ['Mobile', `+91 ${f.phone}`], ['Name', f.name], ['Type', f.kind], ['Email', f.email || 'None'],
    ['Address', `${f.addrCity}, ${f.addrState} ${f.addrPin}`], ['PAN', f.pan], ['GSTIN', f.gstin || 'Not registered'],
    ['Bank', `${f.bankName}, ${mask(f.acctNo)}`], ['Property', f.propertyCode || `${f.propertyName}, ${f.propertyTown}`],
  ];
  return (
    <StepFrame step={7} steps={SIGNUP_STEPS} title="Check and create" nextTitle="Create account" onNext={next} nextLoading={busy}>
      <View style={styles.review}>
        {review.map(([l, v], i) => <KeyValueRow key={l} label={l} value={v} mono={false} divider={i < review.length - 1} />)}
      </View>
      <AppText variant="small" color="muted" style={styles.edit}>Go back to any step to change something.</AppText>
      <Input label="Password" value={f.password} onChangeText={set('password')} secure placeholder="At least 8 characters" error={errors.password} style={styles.field} />
      <Input label="Confirm password" value={f.password2} onChangeText={set('password2')} secure error={errors.password2} style={styles.field} />
      <Checkbox checked={f.agree} onChange={set('agree')} label="The details are correct and my PAN and bank account may be verified." />
      {errors.agree ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{errors.agree}</AppText> : null}
      <View style={styles.note}><Icon name="lock" size={18} color={colors.muted} /><AppText variant="small" color="muted" style={styles.flex}>Your account is ready to use after the facilities team checks these details and links your property. Usually one working day.</AppText></View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ review: { backgroundColor: colors.sunk, borderRadius: ms(18), paddingHorizontal: s(16) }, edit: { marginTop: vs(10), marginBottom: vs(20) }, field: { marginBottom: vs(18) }, err: { marginTop: vs(8) }, note: { flexDirection: 'row', gap: s(10), alignItems: 'flex-start', marginTop: vs(20) }, flex: { flex: 1 } });
