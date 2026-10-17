/* "More" → All sections (design p.3): search, Premises and Money grids of section tiles. Also hosts sign-out and the
   role preview switch (until real accounts exist). */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signedOut, switchRole } from '../../store/slices/authSlice';
import { colors, ms, s, vs, tabBarSpace } from '../../theme';
import { BottomSheet, AppText, Icon, Segmented, Button, ConfirmDialog } from '../../components';
import { sections } from '../../mock/data';

function SectionTile({ icon, title, sub, subTone, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={styles.iconBox}><Icon name={icon} size={24} color={colors.teal} /></View>
      <AppText variant="h4" weight="semibold" style={styles.tileTitle}>{title}</AppText>
      <AppText variant="small" weight={subTone ? 'semibold' : undefined} color={subTone === 'amber' ? 'amberInk' : subTone === 'coral' ? 'coralInk' : 'muted'} style={styles.tileSub}>{sub}</AppText>
    </Pressable>
  );
}

export default function AllSectionsSheet({ open, onClose }) {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const [askOut, setAskOut] = useState(false);
  const role = useAppSelector(st => st.auth.role);
  const go = to => { onClose(); setTimeout(() => nav.navigate(to), 120); };
  return (
    <BottomSheet open={open} onClose={onClose} title="All sections" scroll>
      <Pressable style={styles.search} onPress={() => go('Search')} accessibilityRole="search">
        <Icon name="search" size={22} color={colors.muted} />
        <AppText variant="body" color="muted" style={styles.searchText}>Search properties, owners, invoices</AppText>
      </Pressable>
      {Object.entries(sections).map(([group, items]) => (
        <View key={group}>
          <AppText variant="title" color="muted" style={styles.group}>{group}</AppText>
          <View style={styles.grid}>
            {items.map(it => <SectionTile key={it.title} {...it} onPress={() => go(it.to)} />)}
          </View>
        </View>
      ))}
      <AppText variant="title" color="muted" style={styles.group}>Account</AppText>
      <AppText variant="small" color="muted" style={styles.previewHint}>Preview as</AppText>
      <Segmented compact value={role} onChange={r => { dispatch(switchRole(r)); onClose(); }} options={[{ label: 'Staff', value: 'staff' }, { label: 'Owner', value: 'owner' }, { label: 'Franchise', value: 'franchise' }]} />
      <Button title="Sign out" variant="secondary" size="md" icon="log-out" onPress={() => setAskOut(true)} style={styles.signOut} />
      <Button title="Delete account" variant="ghost" size="md" color={colors.coral} onPress={() => go('DeleteAccount')} style={styles.del} />
      <View style={{ height: tabBarSpace }} />
      <ConfirmDialog open={askOut} icon="log-out" title="Sign out?" text="You will need your password to sign in again on this phone." confirmLabel="Sign out" onCancel={() => setAskOut(false)} onConfirm={() => { setAskOut(false); dispatch(signedOut()); }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: s(14), backgroundColor: colors.sunk, borderRadius: ms(18), height: vs(52), paddingHorizontal: s(18) },
  searchText: { fontSize: ms(15) },
  group: { marginTop: vs(24), marginBottom: vs(12), fontSize: ms(15) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12) },
  tile: { width: '47.5%', flexGrow: 1, backgroundColor: colors.sunk, borderRadius: ms(20), padding: s(14), paddingBottom: vs(16) },
  iconBox: { width: ms(40), height: ms(40), borderRadius: ms(12), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineSoft },
  tileTitle: { marginTop: vs(16), fontSize: ms(17) },
  tileSub: { marginTop: vs(4), fontSize: ms(13.5) },
  pressed: { opacity: 0.85 },
  previewHint: { marginBottom: vs(8) },
  signOut: { marginTop: vs(14) },
  del: { marginTop: vs(4), alignSelf: 'center' },
});
