/* Site evaluation (design p.6): saved stamp, chips, step chips, photo + walk-around video, catchment gauge card,
   three measurement tiles, space-plan table, Save draft / Next: Earthing. */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Header, Icon, Chip, FilterChip, PhotoTile, Gauge, Footer, Button, SectionHeader } from '../../components';
import { site } from '../../mock/data';

function MeasureTile({ label, value, unit, sub, subTone, mono }) {
  return (
    <View style={styles.mTile}>
      <AppText variant="small" color="muted" style={styles.mLabel}>{label}</AppText>
      <View style={styles.mValueRow}>
        <AppText variant="monoLg">{value}</AppText>
        {unit ? <AppText variant="mono" color="ink" style={styles.unit}>{unit}</AppText> : null}
      </View>
      <AppText variant={mono ? 'mono' : 'small'} weight={subTone ? 'semibold' : undefined} color={subTone === 'coral' ? 'coralInk' : 'muted'} style={styles.mSub}>{sub}</AppText>
    </View>
  );
}

export default function SiteEvaluationScreen() {
  const nav = useNavigation();
  return (
    <Screen padded={false} footer={(
      <Footer hint={site.todo}>
        <Button title="Save draft" variant="secondary" full onPress={() => nav.goBack()} />
        <Button title="Next: Earthing" variant="primary" full onPress={() => {}} />
      </Footer>
    )}>
      <View style={styles.pad}>
        <Header heading={site.name} sub={`Site evaluation, ${site.place}`} right={<View style={styles.saved}><Icon name="check" size={18} color={colors.muted} /><AppText variant="body" color="muted">{site.saved}</AppText></View>} />
        <View style={styles.chips}>{site.chips.map(c => <Chip key={c.label} {...c} />)}</View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps} style={styles.stepsWrap}>
        {site.steps.map(st => <FilterChip key={st.label} label={st.label} done={st.done} selected={st.current} />)}
      </ScrollView>
      <View style={styles.pad}>
        <View style={styles.media}>
          <PhotoTile label="Front view" height={132} />
          <PhotoTile label="Walk-around 0:52" play height={132} />
        </View>
        <View style={styles.catch}>
          <Gauge width={120} stroke={10} value={0.72} color={colors.white} track="rgba(255,255,255,0.3)">
            <AppText variant="monoXl" color="white" style={styles.gaugeNum}>{site.catchment.index}</AppText>
          </Gauge>
          <View style={styles.catchText}>
            <AppText variant="h3" color="white">Catchment index</AppText>
            <AppText variant="body" color={colors.onTealMuted} style={styles.catchBody}>{site.catchment.text}</AppText>
          </View>
        </View>
        <View style={styles.measures}>{site.tiles.map(t => <MeasureTile key={t.label} {...t} />)}</View>
        <SectionHeader title="Space plan" action={site.plan.met} actionColor="muted" />
        <View style={styles.tableHead}>
          <AppText variant="body" color="muted">Need</AppText>
          <AppText variant="body" color="muted" style={styles.needHead}>Needed / has</AppText>
        </View>
        {site.plan.rows.map(r => (
          <View key={r.need} style={styles.tr}>
            <AppText variant="body" style={[styles.td, styles.flex]}>{r.need}</AppText>
            <AppText variant="mono" style={styles.num}>{r.needed} / {r.has}</AppText>
            <Chip label={r.ok ? 'Met' : 'Short'} tone={r.ok ? 'teal' : 'coral'} size="sm" style={styles.metChip} />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  saved: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  chips: { flexDirection: 'row', gap: s(8), marginTop: vs(12) },
  stepsWrap: { flexGrow: 0, marginTop: vs(16) },
  steps: { paddingHorizontal: gutter, gap: s(8) },
  media: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
  catch: { flexDirection: 'row', alignItems: 'center', gap: s(16), backgroundColor: colors.teal, borderRadius: ms(24), padding: s(18), marginTop: vs(16) },
  gaugeNum: { marginTop: vs(8) },
  catchText: { flex: 1 },
  catchBody: { marginTop: vs(4), fontSize: ms(14.5) },
  measures: { flexDirection: 'row', gap: s(10), marginTop: vs(14) },
  mTile: { flex: 1, backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(12), paddingVertical: vs(14) },
  mLabel: { fontSize: ms(13.5) },
  mValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: s(6), marginTop: vs(2) },
  unit: { fontSize: ms(13) },
  mSub: { marginTop: vs(4), fontSize: ms(13) },
  tableHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: vs(10), borderBottomWidth: 1, borderBottomColor: colors.line },
  needHead: { marginRight: s(60) },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: colors.lineSoft, gap: s(10) },
  td: { fontSize: ms(15) },
  flex: { flex: 1 },
  num: { fontSize: ms(15), minWidth: s(88), textAlign: 'right' },
  metChip: { minWidth: s(58), justifyContent: 'center' },
});
