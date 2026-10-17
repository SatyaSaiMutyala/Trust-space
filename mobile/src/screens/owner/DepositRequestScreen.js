/* Owner deposit request (design p.18): the question, teal share card with the deposit bar, breakdown rows,
   refund after handover, who has agreed, Agree / Decline. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, KeyValueRow, Chip, Footer, Button } from '../../components';
import { depositRequest } from '../../mock/data';

export default function DepositRequestScreen() {
  const nav = useNavigation();
  const d = depositRequest;
  return (
    <Screen footer={(
      <Footer stacked>
        <Button title="Agree" variant="primary" onPress={() => nav.goBack()} />
        <Button title="Decline" variant="secondary" onPress={() => nav.goBack()} style={styles.decline} />
      </Footer>
    )}>
      <Header heading={d.title} sub={d.eyebrow} />
      <AppText variant="body" color="muted" style={styles.body}>{d.body}</AppText>
      <View style={styles.card}>
        <View style={styles.shareRow}>
          <AppText variant="body" color={colors.onTealMuted} style={styles.cardLabel}>Your share</AppText>
          <AppText variant="monoXl" color="white">{d.share}</AppText>
        </View>
        <View style={[styles.shareRow, styles.holdRow]}>
          <AppText variant="body" color={colors.onTealMuted} style={styles.cardLabel}>Deposit you hold</AppText>
          <AppText variant="monoMd" color="white">{d.hold}</AppText>
        </View>
        <View style={styles.bar}><View style={[styles.stays, { flex: d.stays }]} /><View style={[styles.used, { flex: 1 - d.stays }]} /></View>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.white }]} /><AppText variant="small" color={colors.onTealMuted}>Stays with you</AppText></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.amber }]} /><AppText variant="small" color={colors.onTealMuted}>Used for Nov rent</AppText></View>
        </View>
      </View>
      <View style={styles.rows}>
        {d.rows.map(r => <KeyValueRow key={r.label} label={r.label} value={r.value} size="lg" />)}
        <KeyValueRow label="Refund after handover" value={d.refund} bold size="lg" divider={false} />
      </View>
      <View style={styles.parties}>
        {d.parties.map((p, i) => (
          <View key={p.name} style={[styles.party, i < d.parties.length - 1 && styles.partyDivider]}>
            <AppText variant="body" style={styles.partyName}>{p.name}</AppText>
            <Chip label={p.chip} tone={p.tone} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  body: { marginTop: vs(10), fontSize: ms(15) },
  card: { backgroundColor: colors.teal, borderRadius: ms(24), padding: s(20), marginTop: vs(20) },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdRow: { marginTop: vs(14) },
  cardLabel: { fontSize: ms(15) },
  bar: { flexDirection: 'row', height: vs(12), borderRadius: 6, overflow: 'hidden', marginTop: vs(12) },
  stays: { backgroundColor: colors.white },
  used: { backgroundColor: colors.amber },
  legend: { flexDirection: 'row', gap: s(16), marginTop: vs(10) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(3) },
  rows: { marginTop: vs(18) },
  parties: { backgroundColor: colors.sunk, borderRadius: ms(20), marginTop: vs(10), paddingHorizontal: s(16) },
  party: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(14) },
  partyDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  partyName: { fontSize: ms(15) },
  decline: { marginTop: vs(12) },
});
