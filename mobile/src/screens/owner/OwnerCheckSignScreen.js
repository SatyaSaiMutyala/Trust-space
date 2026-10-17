/* Owner Check and sign (design p.17): intro, 38 fine / 10 issue tiles, then/now photo pairs for deposit items,
   owner's own items, normal wear, I agree sign / Something is wrong. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, Arch, SectionHeader, Footer, Button } from '../../components';
import { ownerCheck } from '../../mock/data';

function Thumb({ label }) {
  return (
    <Arch photo width={54} height={56} bottomRadius={10}>
      <View style={styles.thumbChip}><AppText variant="captionSemi" color="white">{label}</AppText></View>
    </Arch>
  );
}

export default function OwnerCheckSignScreen() {
  const nav = useNavigation();
  const c = ownerCheck;
  return (
    <Screen footer={(
      <Footer stacked>
        <Button title="I agree, sign" variant="primary" onPress={() => nav.goBack()} />
        <Button title="Something is wrong" variant="danger" onPress={() => {}} style={styles.wrong} />
      </Footer>
    )}>
      <Header heading="Check and sign" />
      <AppText variant="body" color="muted" style={styles.intro}>{c.intro}</AppText>
      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: colors.tealTint }]}><AppText variant="monoXl" color="tealInk">{c.fine}</AppText><AppText variant="body" color="tealInk" style={styles.tileSub}>things are fine</AppText></View>
        <View style={[styles.tile, { backgroundColor: colors.coralTint }]}><AppText variant="monoXl" color="coralInk">{c.issues}</AppText><AppText variant="body" color="coralInk" style={styles.tileSub}>have an issue</AppText></View>
      </View>
      <SectionHeader title="Paid from the deposit" />
      {c.deposit.map((d, i) => (
        <View key={d.title} style={[styles.row, i < c.deposit.length - 1 && styles.divider]}>
          <View style={styles.thumbs}><Thumb label="then" /><Thumb label="now" /></View>
          <View style={styles.flex}>
            <AppText variant="h4" weight="semibold" style={styles.rowTitle}>{d.title}</AppText>
            <AppText variant="body" color="muted">{d.sub}</AppText>
          </View>
          <AppText variant="monoMd">{d.amount}</AppText>
        </View>
      ))}
      <AppText variant="body" color="muted" style={styles.share}>Your share from the deposit: <AppText variant="monoMd" color="ink">{c.share}</AppText></AppText>
      <SectionHeader title="For the owners to fix" />
      {c.owners.map(o => (
        <View key={o.title} style={styles.row}>
          <Thumb label="now" />
          <View style={styles.flex}>
            <AppText variant="h4" weight="semibold" style={styles.rowTitle}>{o.title}</AppText>
            <AppText variant="body" color="muted">{o.sub}</AppText>
          </View>
        </View>
      ))}
      <AppText variant="body" color="muted" style={styles.wear}>{c.wear} <AppText variant="bodySemi" color="teal">See all 48</AppText></AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4) },
  intro: { marginTop: vs(10), fontSize: ms(15) },
  tiles: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
  tile: { flex: 1, borderRadius: ms(20), padding: s(16), paddingVertical: vs(20) },
  tileSub: { marginTop: vs(2), fontSize: ms(15) },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(14) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  thumbs: { flexDirection: 'row', gap: s(8) },
  thumbChip: { position: 'absolute', bottom: 5, alignSelf: 'center', backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(7), paddingVertical: 1 },
  rowTitle: { fontSize: ms(17) },
  share: { marginTop: vs(8), fontSize: ms(15) },
  wear: { marginTop: vs(10), fontSize: ms(15) },
  wrong: { marginTop: vs(12) },
  flex: { flex: 1 },
});
