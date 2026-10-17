/* Delete account: what it means, confirm with the password, then the account is closed and the user signed out.
   Lease, invoice and tax records stay with the facilities team as the law requires; the login and personal contact
   details are removed. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signedOut } from '../../store/slices/authSlice';
import { setNotice } from '../../store/slices/uiSlice';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Input, Checkbox, Button, Footer, Icon, Arch } from '../../components';

const LOSES = [
  'Sign-in on every phone stops immediately.',
  'Your mobile number, email, address and notification settings are removed.',
  'Messages and photos you sent are kept with the lease records, without your login.',
  'Rent, TDS and deposit records stay, because tax law requires them for 8 years.',
];

export default function DeleteAccountScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(st => st.auth.user);
  const [password, setPassword] = useState('');
  const [sure, setSure] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const del = () => {
    if (!password) return setError('Enter your password to continue.');
    if (password.length < 4) return setError('That password is not right.'); // POST /api/auth/delete-account checks it once wired
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      dispatch(setNotice({ tone: 'teal', lead: 'Your account is deleted.', text: 'Rent and tax records stay with the facilities team. Contact them if you need a copy.' }));
      dispatch(signedOut());
    }, 700);
  };
  return (
    <Screen footer={(
      <Footer stacked>
        <Button title="Delete my account" variant="coralSolid" onPress={del} loading={busy} disabled={!sure} />
        <Button title="Keep my account" variant="secondary" onPress={() => nav.goBack()} style={styles.keep} />
      </Footer>
    )}>
      <Header heading="Delete account" />
      <AppText variant="body" color="muted" style={styles.intro}>This closes the account for {user?.name || 'you'}. It cannot be undone.</AppText>
      <View style={styles.card}>
        <Arch width={64} height={70} bg={colors.coralTint} bottomRadius={14}><View style={styles.iconWrap}><Icon name="alert-triangle" size={28} color={colors.coral} strokeWidth={1.8} /></View></Arch>
        <View style={styles.flex}>
          {LOSES.map(l => (
            <View key={l} style={styles.bullet}>
              <View style={styles.dot} />
              <AppText variant="small" style={styles.flex}>{l}</AppText>
            </View>
          ))}
        </View>
      </View>
      <Input label="Your password" value={password} onChangeText={v => { setPassword(v); setError(''); }} secure placeholder="Confirm it is you" error={error} style={styles.field} />
      <Checkbox checked={sure} onChange={setSure} label="I understand my sign-in will stop and this cannot be undone." />
      <AppText variant="small" color="muted" style={styles.note}>Deleting the account does not end a lease or change who is paid rent. Talk to the facilities team for that.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  intro: { marginTop: vs(8), fontSize: ms(15) },
  card: { flexDirection: 'row', gap: s(14), backgroundColor: colors.sunk, borderRadius: ms(20), padding: s(16), marginTop: vs(20), marginBottom: vs(22) },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bullet: { flexDirection: 'row', gap: s(8), alignItems: 'flex-start', marginBottom: vs(8) },
  dot: { width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: colors.coral, marginTop: vs(7) },
  field: { marginBottom: vs(16) },
  note: { marginTop: vs(16) },
  keep: { marginTop: vs(12) },
  flex: { flex: 1 },
});
