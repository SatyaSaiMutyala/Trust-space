/* Franchise My locations (design p.19): Add a location, rows with arch thumbnails, status chips, progress segments
   and per-state actions. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Button, Arch, Chip, ProgressSegments, Icon } from '../../components';
import { locations, franchiseUser } from '../../mock/data';

export default function MyLocationsScreen() {
  const nav = useNavigation();
  const user = useAppSelector(st => st.auth.user) || franchiseUser;
  return (
    <Screen tabs>
      <AppText variant="body" color="muted" style={styles.eyebrow}>{user.name}</AppText>
      <AppText variant="display">My locations</AppText>
      <Button title="Add a location" variant="primary" icon="plus" onPress={() => nav.navigate('AddSite')} style={styles.add} />
      {locations.map((l, i) => (
        <View key={l.name} style={[styles.row, i < locations.length - 1 && styles.divider]}>
          <Arch photo={!l.draft} width={66} height={76} bottomRadius={14} bg={l.draft ? '#EEF6F4' : undefined} dashed={l.draft} dashColor={colors.line} style={styles.thumb}>
            {l.draft ? <View style={styles.camWrap}><Icon name="camera" size={24} color={colors.muted} /></View> : null}
          </Arch>
          <View style={styles.flex}>
            <View style={styles.head}>
              <AppText variant="h4" weight="semibold" style={[styles.name, styles.flex]}>{l.name}</AppText>
              <Chip label={l.chip} tone={l.tone} />
            </View>
            <AppText variant="body" color="muted" style={styles.sub}>{l.sub}</AppText>
            {l.progress ? <ProgressSegments items={l.progress.map((v, k) => ({ value: v, tone: l.tones ? l.tones[k] : 'teal' }))} height={6} style={styles.progress} /> : null}
            {l.actions ? (
              <View style={styles.actions}>
                <Button title={l.actions[0]} variant="secondary" size="md" full onPress={() => {}} />
                <Button title={l.actions[1]} variant="tonal" size="md" full onPress={() => {}} />
              </View>
            ) : null}
            {l.link ? <Pressable onPress={() => nav.navigate('SiteEvaluation')} hitSlop={8}><AppText variant="title" color="teal" style={styles.link}>{l.link}</AppText></Pressable> : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: vs(14), fontSize: ms(15) },
  add: { marginTop: vs(18), marginBottom: vs(6) },
  row: { flexDirection: 'row', gap: s(14), paddingVertical: vs(18) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  thumb: {},
  camWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: s(8) },
  name: { fontSize: ms(18) },
  sub: { marginTop: vs(4), fontSize: ms(15) },
  progress: { marginTop: vs(10) },
  actions: { flexDirection: 'row', gap: s(8), marginTop: vs(12) },
  link: { marginTop: vs(8) },
  flex: { flex: 1 },
});
