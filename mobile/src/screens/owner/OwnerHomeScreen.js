/* Owner home (design p.15): Namaskaram, teal arch with the gauge and Sent / Checked / Approving / Paid,
   Your to-do amber tiles, This year, Form 16A download. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, HeroCard, Gauge, Tile, SectionHeader, ListRow, Icon } from '../../components';
import { ownerHome } from '../../mock/data';

export default function OwnerHomeScreen() {
  const nav = useNavigation();
  const h = ownerHome.hero;
  return (
    <Screen tabs>
      <View style={styles.top}>
        <View>
          <AppText variant="body" color="muted" style={styles.greet}>{ownerHome.greeting}</AppText>
          <AppText variant="display">{ownerHome.name}</AppText>
        </View>
      </View>
      <HeroCard arch arcs="none" style={styles.hero} padding={false}>
        <View style={styles.heroInner}>
          <Gauge width={220} stroke={11} value={h.value} color={colors.white} track="rgba(255,255,255,0.28)" knob={colors.amber}>
            <AppText variant="monoXl" color="white" style={styles.amount}>{h.amount}</AppText>
            <AppText variant="body" color={colors.onTealMuted} style={styles.heroSub}>{h.sub}</AppText>
          </Gauge>
          <View style={styles.stepsRow}>
            {h.steps.map(st => (
              <View key={st.label} style={styles.step}>
                <AppText variant="small" color={st.current ? colors.amber : colors.onTealMuted} center style={styles.stepLabel}>{st.label}</AppText>
                <AppText variant="smallSemi" color={st.current ? colors.amber : colors.white} center style={styles.stepVal}>{st.value}</AppText>
              </View>
            ))}
          </View>
          <View style={styles.heroLine} />
          <AppText variant="body" color={colors.onTealMuted} center style={styles.note}>{h.note}</AppText>
        </View>
      </HeroCard>
      <SectionHeader title="Your to-do" />
      <View style={styles.tiles}>
        {ownerHome.todo.map(t => <Tile key={t.title} tone="amber" icon={t.icon} title={t.title} sub={t.sub} subTone="amber" subWeight="regular" onPress={() => nav.navigate(t.to)} />)}
      </View>
      <SectionHeader title="This year" />
      <Pressable style={styles.year} onPress={() => nav.navigate('OwnerLedger')} accessibilityRole="button" accessibilityLabel="Open ledger">
        {ownerHome.year.map((y, i) => (
          <View key={y.label} style={[styles.yearCol, i === 0 && styles.yearDivider]}>
            <AppText variant="body" color="muted">{y.label}</AppText>
            <AppText variant="monoLg" style={styles.yearVal}>{y.value}</AppText>
          </View>
        ))}
      </Pressable>
      <ListRow left={<View style={styles.dl}><Icon name="download" size={22} color={colors.teal} /></View>} title={ownerHome.form16.title} sub={ownerHome.form16.sub} chevron onPress={() => nav.navigate('Agreements')} divider={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: vs(10) },
  greet: { fontSize: ms(15) },
  hero: { marginTop: vs(20) },
  heroInner: { alignItems: 'center', paddingTop: vs(46), paddingBottom: vs(20), paddingHorizontal: s(18) },
  amount: { marginTop: vs(26), fontSize: ms(30) },
  heroSub: { marginTop: vs(2), fontSize: ms(15) },
  stepsRow: { flexDirection: 'row', alignSelf: 'stretch', marginTop: vs(8) },
  step: { flex: 1 },
  stepLabel: { fontSize: ms(13.5) },
  stepVal: { marginTop: vs(2), fontSize: ms(14.5) },
  heroLine: { alignSelf: 'stretch', height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: vs(18), marginBottom: vs(14) },
  note: { fontSize: ms(15) },
  tiles: { flexDirection: 'row', gap: s(12) },
  year: { flexDirection: 'row', borderWidth: 1.5, borderColor: colors.line, borderRadius: ms(20), overflow: 'hidden' },
  yearCol: { flex: 1, padding: s(16), paddingVertical: vs(18) },
  yearDivider: { borderRightWidth: 1.5, borderRightColor: colors.line },
  yearVal: { marginTop: vs(4) },
  dl: { width: ms(44), height: ms(44), borderRadius: ms(14), backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
