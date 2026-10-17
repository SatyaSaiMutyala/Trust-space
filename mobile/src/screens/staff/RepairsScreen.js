/* Repairs tab: open tickets with priority chips. Shows the empty state (design p.21) when nothing is open. */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { s, vs, gutter } from '../../theme';
import { Screen, AppText, ListRow, Chip, FilterChip, EmptyState } from '../../components';
import { repairsList } from '../../mock/data';

const FILTERS = ['Open 14', 'Past SLA 3', 'With owner 4', 'Resolved'];

export default function RepairsScreen() {
  const nav = useNavigation();
  const [f, setF] = useState(FILTERS[0]);
  const empty = f === 'Resolved';
  return (
    <Screen tabs padded={false}>
      <View style={styles.pad}>
        <AppText variant="display" style={styles.title}>Repairs</AppText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersWrap}>
        {FILTERS.map(x => <FilterChip key={x} label={x} selected={f === x} onPress={() => setF(x)} />)}
      </ScrollView>
      <View style={styles.pad}>
        {empty ? (
          <EmptyState title="No open repairs" body="All 38 premises are clear. The last ticket closed on 12 Oct at Kukatpally CC." action="Report an issue" onAction={() => nav.navigate('RaiseTicket')} />
        ) : repairsList.map((t, i) => (
          <ListRow key={t.code} title={t.title} sub={`${t.code} · ${t.sub}`} right={<Chip label={t.chip} tone={t.tone} size="sm" />} chevron onPress={() => nav.navigate('TicketDetail')} divider={i < repairsList.length - 1} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  title: { marginTop: vs(14) },
  filtersWrap: { flexGrow: 0, marginTop: vs(16), marginBottom: vs(6) },
  filters: { paddingHorizontal: gutter, gap: s(10) },
});
