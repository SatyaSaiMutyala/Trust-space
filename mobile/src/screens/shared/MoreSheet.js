/* "More" sheet for owners and franchise partners: profile, documents, help, sign out, role preview. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signedOut, switchRole } from '../../store/slices/authSlice';
import { vs, tabBarSpace } from '../../theme';
import { BottomSheet, AppText, ListRow, Icon, Segmented, Button } from '../../components';
import { colors } from '../../theme';

export default function MoreSheet({ open, onClose }) {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector(st => st.auth);
  const go = to => { onClose(); setTimeout(() => nav.navigate(to), 120); };
  const rows = role === 'owner' ? [
    { icon: 'users', title: user?.name || 'My details', sub: 'PAN valid · bank verified', to: 'MyDetails' },
    { icon: 'ledger', title: 'Ledger', sub: 'Received, TDS credited, what is coming', to: 'OwnerLedger' },
    { icon: 'file-text', title: 'Agreements', sub: 'Leases, annexures, Form 16A, notices', to: 'Agreements' },
    { icon: 'info', title: 'Help', sub: 'Call the facilities team, 9 am – 6 pm' },
  ] : [
    { icon: 'users', title: user?.name || 'Profile', sub: 'Franchise partner' },
    { icon: 'map-pin', title: 'Add a location', sub: 'A place you have found', to: 'AddSite' },
    { icon: 'info', title: 'Help', sub: 'Call the facilities team, 9 am – 6 pm' },
  ];
  return (
    <BottomSheet open={open} onClose={onClose} title="More" scroll>
      {rows.map((r, i) => <ListRow key={r.title} left={<Icon name={r.icon} size={24} color={colors.teal} />} title={r.title} sub={r.sub} chevron divider={i < rows.length - 1} onPress={() => (r.to ? go(r.to) : onClose())} />)}
      <AppText variant="title" color="muted" style={styles.group}>Preview as</AppText>
      <Segmented compact value={role} onChange={r => { dispatch(switchRole(r)); onClose(); }} options={[{ label: 'Staff', value: 'staff' }, { label: 'Owner', value: 'owner' }, { label: 'Franchise', value: 'franchise' }]} />
      <Button title="Sign out" variant="secondary" size="md" icon="log-out" onPress={() => { onClose(); dispatch(signedOut()); }} style={styles.signOut} />
      <Button title="Delete account" variant="ghost" size="md" color={colors.coral} onPress={() => go('DeleteAccount')} style={styles.del} />
      <View style={{ height: tabBarSpace }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ group: { marginTop: vs(22), marginBottom: vs(10) }, signOut: { marginTop: vs(20) }, del: { marginTop: vs(6), alignSelf: 'center' } });
