/* Owner ledger: what came in this year, TDS credited, what is coming, month by month, statement download. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Icon, Tile, ListRow, Chip, Button } from '../../components';
import { ownerLedger } from '../../mock/data';

export default function OwnerLedgerScreen() {
  const l = ownerLedger;
  return (
    <Screen>
      <Header heading="Ledger" sub={l.property} right={(
        <Pressable style={styles.fy} accessibilityRole="button" accessibilityLabel="Financial year">
          <AppText variant="title">{l.fy}</AppText>
          <Icon name="chevron-down" size={20} color={colors.ink} />
        </Pressable>
      )} />
      <View style={styles.tiles}>
        {l.tiles.map(t => <Tile key={t.label} tone={t.tone} label={t.label} value={t.value} valueVariant="monoMd" compact style={styles.tile} />)}
      </View>
      {l.rows.map((r, i) => (
        <ListRow key={i} title={<AppText variant="title" style={styles.month}>{r.month}</AppText>} sub={r.sub} divider={i < l.rows.length - 1}
          right={<View style={styles.right}><AppText variant="monoMd">{r.amount}</AppText><Chip label={r.chip} tone={r.tone} size="sm" /></View>} />
      ))}
      <Button title="Download statement" variant="secondary" size="md" icon="download" onPress={() => {}} style={styles.download} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fy: { flexDirection: 'row', alignItems: 'center', gap: s(8), borderWidth: 2, borderColor: colors.line, borderRadius: ms(14), paddingHorizontal: s(14), height: vs(40) },
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  tiles: { flexDirection: 'row', gap: s(10), marginTop: vs(16), marginBottom: vs(8) },
  tile: { paddingHorizontal: s(12), borderRadius: ms(18) },
  month: { fontSize: ms(17) },
  right: { alignItems: 'flex-end', gap: vs(6) },
  download: { marginTop: vs(22), alignSelf: 'flex-start' },
});
