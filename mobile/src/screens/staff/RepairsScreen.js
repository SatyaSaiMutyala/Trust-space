/* Repairs tab from GET /tickets: filter chips (Open, Past SLA, With owner, Resolved), priority chips, SLA time left.
   Shows the empty state (design p.21) when a filter has nothing. */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs, gutter } from '../../theme';
import { Screen, AppText, ListRow, Chip, FilterChip, EmptyState, ErrorState, Skeleton, Button } from '../../components';
import { useList, useLookup } from '../../store/hooks';
import { errorMessage, slaDue, slaText, PRI_LABEL } from '../../store/api';

const PRI_TONE = { P1: 'coral', P2: 'amber', P3: 'blue', P4: 'grey' };

export default function RepairsScreen() {
  const nav = useNavigation();
  const [f, setF] = useState('open');
  const open = useList('tickets', { open: true }, { sort: 'createdAt', order: 'desc', limit: 50 });
  const done = useList('tickets', { open: false }, { sort: 'createdAt', order: 'desc', limit: 30 });
  const props = useLookup('properties');
  const now = new Date();
  const pastSla = open.items.filter(t => slaDue(t) < now);
  const withOwner = open.items.filter(t => t.status === 'Awaiting owner');
  const FILTERS = [['open', `Open ${open.total || open.items.length}`], ['sla', `Past SLA ${pastSla.length}`], ['owner', `With owner ${withOwner.length}`], ['done', 'Resolved']];
  const list = f === 'open' ? open.items : f === 'sla' ? pastSla : f === 'owner' ? withOwner : done.items;
  const src = f === 'done' ? done : open;
  return (
    <Screen tabs padded={false}>
      <View style={styles.pad}>
        <View style={styles.head}>
          <AppText variant="display" style={styles.title}>Repairs</AppText>
          <Button title="Raise ticket" variant="tonal" size="sm" icon="plus" onPress={() => nav.navigate('RaiseTicket')} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersWrap}>
        {FILTERS.map(([k, label]) => <FilterChip key={k} label={label} selected={f === k} onPress={() => setF(k)} />)}
      </ScrollView>
      <View style={styles.pad}>
        {src.isLoading ? [0, 1, 2].map(i => <Skeleton key={i} h={64} r={14} style={styles.skel} />)
          : src.error ? <ErrorState title="Couldn't load repairs" body={errorMessage(src.error)} action="Try again" onAction={src.refetch} />
            : !list.length ? <EmptyState title={f === 'open' ? 'No open repairs' : f === 'sla' ? 'Nothing past SLA' : f === 'owner' ? 'Nothing with owners' : 'Nothing resolved yet'} body={f === 'open' ? 'All premises are clear.' : undefined} action={f === 'open' ? 'Report an issue' : undefined} onAction={() => nav.navigate('RaiseTicket')} />
              : list.map((t, i) => (
                <ListRow key={t.id} title={t.title} sub={`${t.no} · ${props.name(t.propertyId)}${f === 'done' ? ` · ${t.status}` : ` · ${slaText(t, now)}`}`} subColor={f !== 'done' && slaDue(t) < now ? 'coralInk' : 'muted'} right={<Chip label={PRI_LABEL[t.priority] || t.priority} tone={PRI_TONE[t.priority] || 'grey'} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail', { id: t.id })} divider={i < list.length - 1} />
              ))}
        {src.hasMore ? <Button title="Load more" variant="tonal" size="md" onPress={src.loadMore} style={styles.more} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(14) },
  title: {},
  filtersWrap: { flexGrow: 0, marginTop: vs(16), marginBottom: vs(6) },
  filters: { paddingHorizontal: gutter, gap: s(10) },
  skel: { marginTop: vs(12) },
  more: { marginTop: vs(16), alignSelf: 'center' },
});
