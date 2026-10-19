/* Franchise My locations (design p.19) from GET /sites (scoped to the partner): each location with its stage,
   progress and the next step. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Button, Arch, Chip, ProgressSegments, Icon, Skeleton, ErrorState, EmptyState } from '../../components';
import { useList } from '../../store/hooks';
import { errorMessage, inr, fmtDate, fileUrl } from '../../store/api';

const STAGES = ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation', 'Acceptance', 'Approved', 'Agreement', 'Take-over', 'Operational'];
const CHIP = s => (s === 'Scouted' ? ['Draft', 'grey'] : s === 'Rejected' ? ['Not approved', 'coral'] : s === 'On hold' ? ['On hold', 'grey'] : ['Approved', 'Agreement', 'Take-over', 'Operational', 'Opened'].includes(s) ? [s === 'Approved' ? 'Approved' : s, 'teal'] : ['Assessing', 'blue']);

export default function MyLocationsScreen() {
  const nav = useNavigation();
  const { user, mediaToken } = useAppSelector(st => st.auth);
  const { items, isLoading, error, refetch } = useList('sites', {}, { sort: 'createdAt', order: 'desc', limit: 30 });
  return (
    <Screen tabs>
      <AppText variant="body" color="muted" style={styles.eyebrow}>{user?.name}</AppText>
      <AppText variant="display">My locations</AppText>
      <Button title="Add a location" variant="primary" icon="plus" onPress={() => nav.navigate('AddSite')} style={styles.add} />
      {isLoading ? <Skeleton h={200} r={18} /> : error ? <ErrorState title="Couldn't load your locations" body={errorMessage(error)} action="Try again" onAction={refetch} /> : !items.length ? <EmptyState title="No locations yet" body="Add a place you have found and the facilities team will assess it." action="Add a location" onAction={() => nav.navigate('AddSite')} /> : items.map((l, i) => {
        const [label, tone] = CHIP(l.stage); const ix = STAGES.indexOf(l.stage); const draft = l.stage === 'Scouted';
        const photo = l.frontPhoto || (l.photos || [])[0];
        const rejected = (l.log || []).slice().reverse().find(x => /^Rejected/.test(x.text || ''));
        return (
          <View key={l.id} style={[styles.row, i < items.length - 1 && styles.divider]}>
            <Arch photo={!draft || !!photo} width={66} height={76} bottomRadius={14} bg={draft && !photo ? '#EEF6F4' : undefined} dashed={draft && !photo} dashColor={colors.line} uri={photo ? fileUrl(photo.id || photo, mediaToken) : undefined}>
              {draft && !photo ? <View style={styles.camWrap}><Icon name="camera" size={24} color={colors.muted} /></View> : null}
            </Arch>
            <View style={styles.flex}>
              <View style={styles.head}>
                <AppText variant="h4" weight="semibold" style={[styles.name, styles.flex]}>{l.name || l.code}</AppText>
                <Chip label={label} tone={tone} />
              </View>
              <AppText variant="body" color="muted" style={styles.sub}>{l.stage === 'Rejected' && rejected ? `“${rejected.text.replace(/^Rejected:\s*/, '')}”` : draft ? 'Add photos, measurements and why it suits' : `${l.purpose || ''}${l.area ? `, ${l.area} sq ft` : ''}${l.quotedRent ? ` · ${inr(l.quotedRent)}` : ''}${l.scoutedOn ? ` · sent ${fmtDate(l.scoutedOn)}` : ''}`}</AppText>
              {l.stage !== 'Rejected' && l.stage !== 'On hold' ? <ProgressSegments items={[0, 1, 2, 3].map(k => ({ value: ix >= [1, 4, 5, 6][k] ? 1 : ix >= [1, 4, 5, 6][k] - 1 && k > 0 ? 0.5 : 0, tone: ix >= 5 ? 'teal' : k === 0 ? 'teal' : 'blue' }))} height={6} style={styles.progress} /> : null}
              <Pressable onPress={() => nav.navigate('SiteEvaluation', { id: l.id })} hitSlop={8}><AppText variant="title" color="teal" style={styles.link}>{draft ? 'Continue' : 'Open'}</AppText></Pressable>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: vs(14), fontSize: ms(15) },
  add: { marginTop: vs(18), marginBottom: vs(6) },
  row: { flexDirection: 'row', gap: s(14), paddingVertical: vs(18) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  camWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: s(8) },
  name: { fontSize: ms(17) },
  sub: { marginTop: vs(4), fontSize: ms(15) },
  progress: { marginTop: vs(10) },
  link: { marginTop: vs(8) },
  flex: { flex: 1 },
});
