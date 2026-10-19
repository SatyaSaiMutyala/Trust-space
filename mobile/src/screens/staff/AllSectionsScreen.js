/* More tab for staff: who is signed in, then every section of the app in two groups (Premises, Money), then the
   account actions (role preview until real accounts exist, sign out, delete account). */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signOut } from '../../store/slices/authSlice';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Icon, Button, ConfirmDialog, Avatar, Chip, ListRow } from '../../components';
import { sections, staffUser } from '../../mock/data';

function SectionRow({ icon, title, sub, subTone, onPress, last }) {
  return (
    <ListRow left={<Icon name={icon} size={24} color={colors.teal} strokeWidth={1.6} />} title={<AppText variant="bodySemi">{title}</AppText>}
      sub={<AppText variant="small" weight={subTone ? 'semibold' : undefined} color={subTone === 'amber' ? 'amberInk' : subTone === 'coral' ? 'coralInk' : 'muted'}>{sub}</AppText>}
      chevron onPress={onPress} divider={!last} style={styles.row} />
  );
}

export default function AllSectionsScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const { role, user } = useAppSelector(st => st.auth);
  const [askOut, setAskOut] = useState(false);
  const u = user || staffUser;
  return (
    <Screen tabs>
      <View style={styles.account}>
        <Avatar initials={u.initials || 'RT'} tone="mist" size={48} />
        <View style={styles.flex}>
          <AppText variant="bodySemi" numberOfLines={1}>{u.name}</AppText>
          <AppText variant="small" color="muted" numberOfLines={1}>{u.team || 'Facilities'}{u.email ? ` · ${u.email}` : ''}</AppText>
        </View>
        <Chip label={role === 'admin' ? 'Admin' : 'Staff'} tone="teal" dot={false} size="sm" />
      </View>
      {Object.entries(sections).map(([group, items]) => (
        <View key={group}>
          <AppText variant="eyebrow" color="muted" style={styles.group}>{group.toUpperCase()}</AppText>
          <View>
            {items.map((it, i) => <SectionRow key={it.title} {...it} last={i === items.length - 1} onPress={() => nav.navigate(it.to)} />)}
          </View>
        </View>
      ))}
      <AppText variant="eyebrow" color="muted" style={styles.group}>ACCOUNT</AppText>
      <View>
        <Button title="Sign out" variant="secondary" size="md" icon="log-out" onPress={() => setAskOut(true)} style={styles.signOut} />
        <Button title="Delete account" variant="ghost" size="sm" color={colors.coral} onPress={() => nav.navigate('DeleteAccount')} style={styles.del} />
      </View>
      <ConfirmDialog open={askOut} icon="log-out" title="Sign out?" text="You will need your password to sign in again on this phone." confirmLabel="Sign out" onCancel={() => setAskOut(false)} onConfirm={() => { setAskOut(false); dispatch(signOut()); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingTop: vs(18), paddingBottom: vs(14), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  group: { marginTop: vs(22), marginBottom: vs(10) },
  row: { paddingVertical: vs(11) },
  signOut: { marginTop: vs(14) },
  del: { marginTop: vs(4), alignSelf: 'center' },
  flex: { flex: 1 },
});
