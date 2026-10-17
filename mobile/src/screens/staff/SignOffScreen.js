/* Sign off together (design p.14): step bars, summary card with the stacked bar, damage and who pays, signatures
   (facilities signed, owner signing on this phone with a signature pad), Raise dispute / Sign as owner. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, StackedBar, SectionHeader, Chip, Footer, Button, Icon, Avatar, Card } from '../../components';
import { signoff } from '../../mock/data';
import { StepBars } from './AreaPhotosScreen';

export default function SignOffScreen() {
  const nav = useNavigation();
  const sm = signoff.summary;
  return (
    <Screen footer={(
      <Footer>
        <Button title="Raise dispute" variant="danger" full onPress={() => {}} />
        <Button title="Sign as owner" variant="primary" full onPress={() => nav.navigate('Tabs')} />
      </Footer>
    )}>
      <Header title={signoff.title} />
      <AppText variant="display" style={styles.title}>Sign off together</AppText>
      <StepBars steps={signoff.steps} />
      <View style={styles.summary}>
        <View style={styles.summaryHead}>
          <AppText variant="h3">{sm.items}</AppText>
          <AppText variant="body" color="muted">{sm.media}</AppText>
        </View>
        <StackedBar parts={[{ value: sm.good, color: colors.teal }, { value: sm.minor, color: colors.amber }, { value: sm.damaged, color: colors.coral }, { value: sm.missing, color: colors.ink }]} height={10} style={styles.bar} />
        <View style={styles.counts}>
          {[[sm.good, 'good'], [sm.minor, 'minor'], [sm.damaged, 'damaged'], [sm.missing, 'missing']].map(([n, l]) => (
            <AppText key={l} variant="body" color="muted"><AppText variant="bodySemi" color="ink">{n}</AppText> {l}</AppText>
          ))}
        </View>
      </View>
      <SectionHeader title="Damage and who pays" />
      {signoff.damage.map(d => (
        <View key={d.title} style={styles.damageRow}>
          <View style={styles.flex}>
            <AppText variant="h4" weight="semibold" style={styles.damageTitle}>{d.title}</AppText>
            <AppText variant="body" color="muted">{d.sub}</AppText>
          </View>
          <Chip label={d.chip} tone={d.tone} dot={false} />
          <AppText variant="monoMd" style={styles.amount}>{d.amount}</AppText>
        </View>
      ))}
      <View style={styles.totalRow}>
        <AppText variant="h4" weight="semibold">From the deposit</AppText>
        <AppText variant="monoLg" weight="semibold">{signoff.fromDeposit}</AppText>
      </View>
      <SectionHeader title="Signatures" />
      <View style={styles.sigRow}>
        <View style={styles.sigDone}><Icon name="check" size={22} color={colors.white} strokeWidth={2.6} /></View>
        <View>
          <AppText variant="h4" weight="semibold">{signoff.signatures.staff.name}</AppText>
          <AppText variant="body" color="muted">{signoff.signatures.staff.sub}</AppText>
        </View>
      </View>
      <Card borderColor={colors.teal} style={styles.ownerCard}>
        <View style={styles.sigRow}>
          <Avatar initials={signoff.signatures.owner.initials} tone="mist" size={44} />
          <View style={styles.flex}>
            <AppText variant="h4" weight="semibold">{signoff.signatures.owner.name}</AppText>
            <AppText variant="body" color="muted">{signoff.signatures.owner.sub}</AppText>
          </View>
          <Pressable hitSlop={8}><AppText variant="title" color="teal">Send to app</AppText></Pressable>
        </View>
        <View style={styles.pad}>
          <Pressable style={styles.clear} hitSlop={8}><AppText variant="title" color="muted">Clear</AppText></Pressable>
          <AppText variant="small" color="muted" center style={styles.padHint}>Sign here with your finger</AppText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4), marginBottom: vs(16) },
  summary: { backgroundColor: colors.tealTint, borderRadius: ms(22), padding: s(18), marginTop: vs(22) },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { marginTop: vs(14) },
  counts: { flexDirection: 'row', gap: s(16), marginTop: vs(12) },
  damageRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  damageTitle: { fontSize: ms(17) },
  amount: { minWidth: s(72), textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: vs(16) },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: s(14), paddingVertical: vs(6) },
  sigDone: { width: ms(44), height: ms(44), borderRadius: ms(22), backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  ownerCard: { marginTop: vs(16) },
  pad: { height: vs(120), backgroundColor: colors.sunk, borderRadius: ms(16), marginTop: vs(12), padding: s(12), justifyContent: 'flex-end' },
  clear: { position: 'absolute', right: s(14), top: vs(10) },
  padHint: {},
  flex: { flex: 1 },
});
