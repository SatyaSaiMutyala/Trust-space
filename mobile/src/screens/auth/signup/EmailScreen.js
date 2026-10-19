/* Sign-up 1 of 7: the email and password the owner will sign in with. POST /auth/register/start emails a code. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../../theme';
import { StepFrame, Input, AppText } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { useRegisterStartMutation, errorMessage } from '../../../store/api';
import { useSignup, isEmail } from './useSignup';

export default function EmailScreen() {
  const nav = useNavigation();
  const { f, set, errors, check, dispatch } = useSignup();
  const [start, state] = useRegisterStartMutation();
  const [serverErr, setServerErr] = useState('');
  const strong = f.password.length >= 8 && /\d/.test(f.password) && /[A-Za-z]/.test(f.password);
  const next = async () => {
    if (!check({ email: (!f.email.trim() || !isEmail(f.email)) && 'Enter a valid email address.', password: !strong && 'At least 8 characters with a letter and a number.', password2: f.password2 !== f.password && 'The passwords do not match.' })) return;
    setServerErr('');
    try {
      const r = await start({ email: f.email.trim().toLowerCase() }).unwrap();
      set('devCode')(r.data?.devCode || ''); set('emailVerified')(false); set('signupToken')('');
      nav.navigate('SignUpOtp');
    } catch (e) { setServerErr(errorMessage(e)); }
  };
  return (
    <StepFrame step={1} steps={SIGNUP_STEPS} title="Create your owner account" intro="You will sign in to the app and the website with this email and password. We will email a code to confirm the address." nextTitle="Send the code" onNext={next} nextLoading={state.isLoading} hint={serverErr || undefined}>
      <Input label="Email" value={f.email} onChangeText={v => set('email')(v.trim())} keyboardType="email-address" placeholder="you@example.com" error={errors.email} style={styles.field} />
      <Input label="Password" value={f.password} onChangeText={set('password')} secure placeholder="At least 8 characters" error={errors.password} style={styles.field} />
      <Input label="Confirm password" value={f.password2} onChangeText={set('password2')} secure error={errors.password2} style={styles.field} />
      {serverErr ? <AppText variant="smallSemi" color="coralInk" style={styles.err}>{serverErr}</AppText> : null}
      <View style={styles.note}>
        <AppText variant="small" color="muted">Already have an account? <AppText variant="smallSemi" color="teal" onPress={() => { dispatch({ type: 'signup/resetSignup' }); nav.goBack(); }}>Sign in</AppText></AppText>
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ field: { marginBottom: vs(18) }, err: { marginBottom: vs(12) }, note: { marginTop: vs(8) } });
