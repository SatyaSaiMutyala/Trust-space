/* Sign in (design p.1): teal arch with the logo, Welcome back, email, password, remember me. Talks to
   POST /auth/login; errors come back in the server's words. Forgot password sends the reset email. */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signIn, setRemember } from '../../store/slices/authSlice';
import { clearNotice, setNotice } from '../../store/slices/uiSlice';
import { useForgotPasswordMutation, errorMessage } from '../../store/api';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Input, Button, Checkbox, Icon, ConfirmDialog } from '../../components';

const ARCH_W = 270;

function Logo({ size = 62 }) {
  const sz = ms(size);
  return <Image source={require('../../assets/images/logo.png')} style={[styles.logo, { width: sz, height: sz, borderRadius: sz * 0.22 }]} accessibilityIgnoresInvertColors />;
}

export default function LoginScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const remember = useAppSelector(st => st.auth.remember);
  const notice = useAppSelector(st => st.ui.notice);
  const [login, setLogin] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askReset, setAskReset] = useState(false);
  const [forgot, forgotState] = useForgotPasswordMutation();
  const w = s(ARCH_W);
  const submit = async () => {
    if (!login.trim() || !pw) { setError('Enter your email and your password.'); return; }
    setBusy(true); setError('');
    const r = await dispatch(signIn({ login: login.trim(), password: pw, remember }));
    setBusy(false);
    if (r.meta.requestStatus === 'rejected') setError(r.payload || 'Could not sign in.');
  };
  const sendReset = async () => {
    setAskReset(false);
    try { const r = await forgot({ login: login.trim() }).unwrap(); dispatch(setNotice({ lead: 'Reset link sent.', text: r.message })); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <Screen keyboard="handled">
      <View style={[styles.arch, { width: w, height: w, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 }]}>
        <Svg style={StyleSheet.absoluteFill} width={w} height={w} viewBox={`0 0 ${w} ${w}`}>
          {[0.86, 0.72, 0.58].map(r => (
            <Path key={r} d={`M ${w / 2 - w * r / 2} ${w} V ${w / 2} A ${w * r / 2} ${w * r / 2} 0 0 1 ${w / 2 + w * r / 2} ${w / 2} V ${w}`} stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} fill="none" />
          ))}
        </Svg>
        <Logo />
        <AppText style={styles.brand} color="white">TruSpace</AppText>
        <AppText variant="body" color={colors.onTealMuted} style={styles.tagline}>Facilities &amp; Leases</AppText>
      </View>
      {notice ? (
        <View style={styles.notice}>
          <Icon name="check-circle" size={22} color={colors.teal} />
          <AppText variant="small" style={styles.noticeText}><AppText variant="smallSemi">{notice.lead} </AppText>{notice.text}</AppText>
          <Pressable onPress={() => dispatch(clearNotice())} hitSlop={10} accessibilityLabel="Dismiss"><Icon name="x" size={20} color={colors.muted} /></Pressable>
        </View>
      ) : null}
      <AppText variant="h1" center style={styles.welcome}>Welcome back</AppText>
      <Input label="Email" value={login} onChangeText={v => { setLogin(v); setError(''); }} keyboardType="email-address" placeholder="you@example.com" style={styles.field} />
      <Input label="Password" rightLabel="Forgot password?" onRightLabel={() => (login.trim() ? setAskReset(true) : setError('Enter your email first, then tap Forgot password.'))} value={pw} onChangeText={v => { setPw(v); setError(''); }} secure error={error} style={styles.field} />
      <Checkbox checked={remember} onChange={v => dispatch(setRemember(v))} label="Remember me on this phone" style={styles.remember} />
      <Button title="Sign in" variant="primary" onPress={submit} loading={busy} style={styles.signIn} />
      <Pressable onPress={() => nav.navigate('SignUpEmail')} hitSlop={8} style={styles.signUp} accessibilityRole="button">
        <AppText variant="body" color="muted" center>Are you a property owner? <AppText variant="bodySemi" color="teal">Create your account</AppText></AppText>
      </Pressable>
      <ConfirmDialog open={askReset} icon="lock" title="Reset your password?" text={`We will send a reset link to ${login.trim()}.`} confirmLabel="Send link" onCancel={() => setAskReset(false)} onConfirm={sendReset} loading={forgotState.isLoading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  arch: { alignSelf: 'center', backgroundColor: colors.teal, borderBottomLeftRadius: ms(36), borderBottomRightRadius: ms(36), alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: vs(28) },
  logo: { marginTop: vs(20) },
  brand: { fontFamily: fonts.display, fontSize: ms(31), lineHeight: ms(38), marginTop: vs(14) },
  tagline: { marginTop: vs(2), fontSize: ms(15) },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10), backgroundColor: colors.tealTint, borderRadius: ms(16), padding: s(14), marginTop: vs(20) },
  noticeText: { flex: 1 },
  welcome: { marginTop: vs(30), marginBottom: vs(22), fontSize: ms(22) },
  field: { marginBottom: vs(18) },
  remember: { marginTop: vs(2) },
  signIn: { marginTop: vs(22) },
  signUp: { marginTop: vs(18), alignItems: 'center' },
});
