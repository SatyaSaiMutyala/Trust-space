/* Sign-up: confirm the mobile number with the six-digit code (sample code 123456 until the API is wired). */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vs } from '../../../theme';
import { StepFrame, OtpInput, AppText } from '../../../components';
import { SIGNUP_STEPS } from '../../../store/slices/signupSlice';
import { useSignup } from './useSignup';

export default function OtpScreen() {
  const nav = useNavigation();
  const { f, set } = useSignup();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [left, setLeft] = useState(30);
  useEffect(() => { if (left <= 0) return undefined; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  const next = () => {
    if (code.length < 6) return setError('Enter all six digits.');
    if (code !== '123456') return setError('That code is not right. Check the SMS and try again.');
    set('otpVerified')(true); nav.navigate('SignUpAbout');
  };
  return (
    <StepFrame step={1} steps={SIGNUP_STEPS} title="Enter the code" intro={`We sent a six-digit code by SMS to +91 ${f.phone}.`} nextTitle="Confirm" onNext={next} nextDisabled={code.length < 6}>
      <OtpInput value={code} onChange={v => { setCode(v); setError(''); }} error={!!error} />
      {error ? <AppText variant="smallSemi" color="coralInk" style={styles.error}>{error}</AppText> : null}
      <View style={styles.resend}>
        {left > 0
          ? <AppText variant="small" color="muted">Resend the code in {left} s</AppText>
          : <Pressable onPress={() => setLeft(30)} hitSlop={8}><AppText variant="smallSemi" color="teal">Resend the code</AppText></Pressable>}
        <Pressable onPress={() => nav.goBack()} hitSlop={8}><AppText variant="smallSemi" color="teal">Change number</AppText></Pressable>
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ error: { marginTop: vs(10) }, resend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: vs(20) } });
