/* Sign in (design p.1): teal arch with the logo, Welcome back, email/mobile, password, remember me. */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signedIn, setRemember } from '../../store/slices/authSlice';
import { clearNotice } from '../../store/slices/uiSlice';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Input, Button, Checkbox, Icon } from '../../components';

const ARCH_W = 270;

function Logo({ size = 72 }) {
  const sz = ms(size);
  return <Image source={require('../../assets/images/logo.png')} style={[styles.logo, { width: sz, height: sz, borderRadius: sz * 0.22 }]} accessibilityIgnoresInvertColors />;
}

export default function LoginScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const remember = useAppSelector(st => st.auth.remember);
  const notice = useAppSelector(st => st.ui.notice);
  const [id, setId] = useState('98480 21734');
  const [pw, setPw] = useState('••••••••••••');
  const [busy, setBusy] = useState(false);
  const w = s(ARCH_W);
  const signIn = () => {
    setBusy(true);
    // Until the API is wired: "owner…" / "franchise…" in the first field previews those roles.
    const v = id.trim().toLowerCase();
    const role = v.startsWith('owner') ? 'owner' : v.startsWith('franchise') ? 'franchise' : 'staff';
    setTimeout(() => { setBusy(false); dispatch(signedIn({ role })); }, 350);
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
      <Input label="Email or mobile number" value={id} onChangeText={setId} keyboardType="email-address" style={styles.field} />
      <Input label="Password" rightLabel="Forgot password?" onRightLabel={() => {}} value={pw} onChangeText={setPw} secure style={styles.field} />
      <Checkbox checked={remember} onChange={v => dispatch(setRemember(v))} label="Remember me on this phone" style={styles.remember} />
      <Button title="Sign in" variant="primary" onPress={signIn} loading={busy} style={styles.signIn} />
      <Pressable onPress={() => nav.navigate('SignUpPhone')} hitSlop={8} style={styles.signUp} accessibilityRole="button">
        <AppText variant="body" color="muted" center>Are you a property owner? <AppText variant="bodySemi" color="teal">Create your account</AppText></AppText>
      </Pressable>
      <View style={styles.spacer} />
      <AppText variant="small" color="muted" center style={styles.lock}>Five wrong passwords lock sign-in for 15 minutes.</AppText>
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
  welcome: { marginTop: vs(30), marginBottom: vs(22), fontSize: ms(30) },
  field: { marginBottom: vs(18) },
  remember: { marginTop: vs(2) },
  signIn: { marginTop: vs(22) },
  signUp: { marginTop: vs(18), alignItems: 'center' },
  spacer: { flex: 1, minHeight: vs(24) },
  lock: { marginTop: vs(16), fontSize: ms(13.5) },
});
