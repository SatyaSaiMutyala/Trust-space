/* TDS (design p.10): FY, Monthly / Challans / Returns / PAN segmented, three tiles, coral "late" card with Record challan,
   register list, Q2 return card. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Segmented, Tile, Button, Chip, ListRow, SectionHeader, Card, Icon } from '../../components';
import { tds } from '../../mock/data';

export default function TdsScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState('monthly');
  return (
    <Screen>
      <Header right={<AppText variant="mono" color="muted" style={styles.fy}>{tds.fy}</AppText>} />
      <AppText variant="display" style={styles.title}>TDS</AppText>
      <Segmented value={tab} onChange={setTab} style={styles.seg} options={[{ label: 'Monthly', value: 'monthly' }, { label: 'Challans', value: 'challans' }, { label: 'Returns', value: 'returns' }, { label: 'PAN', value: 'pan' }]} />
      {tab === 'monthly' ? (
        <>
          <View style={styles.tiles}>
            {tds.tiles.map(t => <Tile key={t.label} tone={t.tone} label={t.label} value={t.value} valueVariant="monoMd" valueColor={t.tone === 'coral' ? colors.coralInk : undefined} compact style={styles.tile} />)}
          </View>
          <View style={styles.late}>
            <AppText variant="h3" color="white">{tds.late.title}</AppText>
            <View style={styles.lateRow}>
              {[['To deposit', tds.late.toDeposit], ['Was due', tds.late.due], ['Interest', tds.late.interest]].map(([l, v]) => (
                <View key={l} style={styles.lateCol}>
                  <AppText variant="small" color="#F8D5C5">{l}</AppText>
                  <AppText variant="monoMd" color="white">{v}</AppText>
                </View>
              ))}
            </View>
            <Button title="Record challan" variant="white" color={colors.coral} onPress={() => nav.navigate('RecordChallan')} style={styles.record} />
          </View>
          <SectionHeader title="Register" />
          {tds.register.map((r, i) => (
            <ListRow key={r.month} divider={i < tds.register.length - 1}
              title={<AppText variant="title" style={styles.month}>{r.month}{r.tag ? <AppText variant="body" color="muted"> {r.tag}</AppText> : null}</AppText>}
              sub={<AppText variant="small" color={r.subTone === 'coral' ? 'coralInk' : 'muted'} style={styles.sub}>{r.sub}</AppText>}
              right={<View style={styles.rowRight}><AppText variant="monoMd">{r.amount}</AppText><Chip label={r.chip} tone={r.tone} style={styles.chip} /></View>} />
          ))}
          <Card outlined style={styles.q2} onPress={() => setTab('returns')}>
            <View style={styles.q2Row}>
              <View style={styles.q2Icon}><Icon name="calendar" size={22} color={colors.amberInk} /></View>
              <View style={styles.flex}>
                <AppText variant="title">{tds.q2.title}</AppText>
                <AppText variant="small" color="muted" style={styles.sub}>{tds.q2.sub}</AppText>
              </View>
              <Icon name="chevron-right" size={22} color={colors.muted} />
            </View>
          </Card>
        </>
      ) : tab === 'challans' ? (
        <View style={styles.list}>{tds.challans.map(c => <ListRow key={c.month} title={c.month} sub={c.sub} right={<AppText variant="monoMd">{c.amount}</AppText>} />)}</View>
      ) : tab === 'returns' ? (
        <View style={styles.list}>{tds.returns.map(r => <ListRow key={r.title} title={r.title} sub={r.sub} right={<Chip label={r.chip} tone={r.tone} />} />)}</View>
      ) : (
        <View style={styles.list}>{tds.pan.map(r => <ListRow key={r.name} title={r.name} sub={r.sub} right={<Chip label={r.chip} tone={r.tone} />} />)}</View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fy: { fontSize: ms(15) },
  title: { marginTop: vs(4) },
  seg: { marginTop: vs(14) },
  tiles: { flexDirection: 'row', gap: s(10), marginTop: vs(14) },
  tile: { paddingHorizontal: s(12), borderRadius: ms(18) },
  late: { backgroundColor: colors.coral, borderRadius: ms(24), padding: s(18), marginTop: vs(14) },
  lateRow: { flexDirection: 'row', marginTop: vs(14), gap: s(10) },
  lateCol: { flex: 1 },
  record: { marginTop: vs(16) },
  month: { fontSize: ms(17) },
  sub: { marginTop: vs(2), fontSize: ms(13.5) },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  chip: { minWidth: s(96), justifyContent: 'center' },
  q2: { marginTop: vs(20) },
  q2Row: { flexDirection: 'row', alignItems: 'center', gap: s(14) },
  q2Icon: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.amberTint, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  list: { marginTop: vs(8) },
});
