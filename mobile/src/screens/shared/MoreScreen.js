/* More tab for owners and franchise partners, as a full screen: who you are, documents and help, sign out, delete
   account, and the role preview until real accounts exist. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signOut } from '../../store/slices/authSlice';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, ListRow, Icon, Button, ConfirmDialog, Avatar } from '../../components';

export default function MoreScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector(st => st.auth);
  const [askOut, setAskOut] = useState(false);
  const owner = role === 'owner';
  const rows = owner ? [
    { icon: 'users', title: 'My details', sub: 'Contact, PAN, GST and bank', to: 'MyDetails' },
    { icon: 'ledger', title: 'Ledger', sub: 'Received, TDS credited, what is coming', to: 'OwnerLedger' },
    { icon: 'file-text', title: 'Agreements', sub: 'Leases, annexures, Form 16A, notices', to: 'Agreements' },
    { icon: 'info', title: 'Help', sub: 'Call the facilities team, 9 am – 6 pm' },
  ] : [
    { icon: 'map-pin', title: 'Add a location', sub: 'A place you have found', to: 'AddSite' },
    { icon: 'file-text', title: 'Approval letters', sub: 'For your approved locations' },
    { icon: 'info', title: 'Help', sub: 'Call the facilities team, 9 am – 6 pm' },
  ];
  const initials = (user?.name || 'U').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Screen tabs>
      <AppText variant="display" style={styles.title}>More</AppText>
      <View style={styles.account}>
        <Avatar initials={user?.initials || initials} size={48} />
        <View style={styles.flex}>
          <AppText variant="h4" weight="semibold">{user?.name || 'Account'}</AppText>
          <AppText variant="small" color="muted">{owner ? 'Property owner · PAN valid · bank verified' : 'Franchise partner'}</AppText>
        </View>
      </View>
      {rows.map((r, i) => (
        <ListRow key={r.title} left={<View style={styles.rowIcon}><Icon name={r.icon} size={22} color={colors.teal} /></View>} title={r.title} sub={r.sub} chevron divider={i < rows.length - 1} onPress={() => (r.to ? nav.navigate(r.to) : null)} />
      ))}
      <Button title="Sign out" variant="secondary" size="md" icon="log-out" onPress={() => setAskOut(true)} style={styles.signOut} />
      <Button title="Delete account" variant="ghost" size="md" color={colors.coral} onPress={() => nav.navigate('DeleteAccount')} style={styles.del} />
      <ConfirmDialog open={askOut} icon="log-out" title="Sign out?" text="You will need your password to sign in again on this phone." confirmLabel="Sign out" onCancel={() => setAskOut(false)} onConfirm={() => { setAskOut(false); dispatch(signOut()); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(14), marginBottom: vs(16) },
  account: { flexDirection: 'row', alignItems: 'center', gap: s(14), backgroundColor: colors.tealTint, borderRadius: ms(20), padding: s(16), marginBottom: vs(8) },
  rowIcon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' },
  group: { marginTop: vs(24), marginBottom: vs(10) },
  signOut: { marginTop: vs(20) },
  del: { marginTop: vs(4), alignSelf: 'center' },
  flex: { flex: 1 },
});
