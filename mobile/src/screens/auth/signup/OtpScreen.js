/* Sign-up: confirm the email with the six-digit code we sent (POST /auth/register/verify → signupToken). */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../../theme';
import { StepFrame, OtpInput, AppText } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { useRegisterStartMutation, useRegisterVerifyMutation, errorMessage } from '../../../store/api';
import { useSignup } from './useSignup';

export default function OtpScreen() {
  const nav = useNavigation();
  const { f, set } = useSignup();
  const [verify, vState] = useRegisterVerifyMutation();
  const [resend, rState] = useRegisterStartMutation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [left, setLeft] = useState(30);
  useEffect(() => { if (left <= 0) return undefined; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  const next = async () => {
    if (code.length < 6) return setError('Enter all six digits.');
    setError('');
    try {
      const r = await verify({ email: f.email, code }).unwrap();
      set('signupToken')(r.data.signupToken); set('emailVerified')(true);
      nav.navigate('SignUpAbout');
    } catch (e) { setError(errorMessage(e)); }
    return undefined;
  };
  const again = async () => {
    setError(''); setInfo('');
    try { const r = await resend({ email: f.email }).unwrap(); set('devCode')(r.data?.devCode || ''); setInfo(r.message); setLeft(30); setCode(''); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <StepFrame step={1} steps={SIGNUP_STEPS} title="Enter the code" intro={`We emailed a six-digit code to ${f.email}. Check the spam folder if it is not there in a minute.`} nextTitle="Confirm" onNext={next} nextDisabled={code.length < 6} nextLoading={vState.isLoading}>
      <OtpInput value={code} onChange={v => { setCode(v); setError(''); }} error={!!error} />
      {error ? <AppText variant="smallSemi" color="coralInk" style={styles.error}>{error}</AppText> : null}
      {info ? <AppText variant="small" color="teal" style={styles.error}>{info}</AppText> : null}
      {__DEV__ && f.devCode ? <AppText variant="caption" color="muted" style={styles.error}>Development: no mail server, the code is {f.devCode}</AppText> : null}
      <View style={styles.resend}>
        {left > 0
          ? <AppText variant="small" color="muted">Resend the code in {left} s</AppText>
          : <Pressable onPress={again} hitSlop={8} disabled={rState.isLoading}><AppText variant="smallSemi" color="teal">{rState.isLoading ? 'Sending…' : 'Resend the code'}</AppText></Pressable>}
        <Pressable onPress={() => nav.goBack()} hitSlop={8}><AppText variant="smallSemi" color="teal">Change email</AppText></Pressable>
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ error: { marginTop: vs(10) }, resend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: vs(20) } });
