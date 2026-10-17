/* Ticket detail (design p.8): code, property, title, chips, SLA ring card, six-step stepper, before/after media,
   facts, updates, "Add an update" composer with camera, Mark resolved. */
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Header, IconButton, Chip, Ring, Stepper, SectionHeader, PhotoTile, KeyValueRow, Footer, Button, Avatar } from '../../components';
import { ticket } from '../../mock/data';

export default function TicketDetailScreen() {
  const nav = useNavigation();
  const [update, setUpdate] = useState('');
  const t = ticket;
  return (
    <Screen footer={(
      <Footer stacked>
        <View style={styles.composerRow}>
          <View style={styles.composer}>
            <TextInput value={update} onChangeText={setUpdate} placeholder="Add an update" placeholderTextColor={colors.muted} style={styles.composerInput} accessibilityLabel="Add an update" />
          </View>
          <IconButton name="camera" variant="sunk" size={54} iconSize={24} color={colors.teal} onPress={() => {}} accessibilityLabel="Add a photo" style={styles.camBtn} />
        </View>
        <Button title="Mark resolved" variant="primary" onPress={() => nav.goBack()} style={styles.resolve} />
      </Footer>
    )}>
      <Header heading={t.title} sub={`${t.code} · ${t.property}`} right={<IconButton name="more" onPress={() => {}} accessibilityLabel="More" />} />
      <View style={styles.chips}>{t.chips.map(c => <Chip key={c.label} {...c} />)}</View>
      <View style={styles.sla}>
        <Ring size={52} stroke={6} value={t.sla.value} />
        <View style={styles.flex}>
          <AppText variant="monoLg" color="amberInk">{t.sla.left}</AppText>
          <AppText variant="body" color="amberInk" style={styles.slaSub}>{t.sla.sub}</AppText>
        </View>
      </View>
      <Stepper steps={t.steps} ring="teal" size={24} style={styles.stepper} />
      <SectionHeader title="Before and after" action="After photo needed" actionColor="coralInk" />
      <View style={styles.media}>
        <PhotoTile height={102} radius={18} />
        <PhotoTile height={102} radius={18} play duration="0:24" />
        <PhotoTile height={102} radius={18} state="capture" label="After photo" onPress={() => {}} />
      </View>
      <View style={styles.facts}>
        {t.facts.map(f => <KeyValueRow key={f.label} label={f.label} value={f.value} mono={!!f.mono} size="lg" />)}
      </View>
      <SectionHeader title="Updates" />
      {t.updates.map((u, i) => (
        <View key={i} style={styles.update}>
          <Avatar initials={u.who.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()} tone={i ? 'mist' : 'teal'} size={36} />
          <View style={styles.flex}>
            <View style={styles.updateHead}>
              <AppText variant="smallSemi">{u.who}</AppText>
              <AppText variant="small" color="muted">{u.when}</AppText>
            </View>
            <AppText variant="body" style={styles.updateText}>{u.text}</AppText>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: ms(15) },
  title: { marginTop: vs(2) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginTop: vs(14) },
  sla: { flexDirection: 'row', alignItems: 'center', gap: s(16), backgroundColor: colors.amberTint, borderRadius: ms(20), padding: s(18), marginTop: vs(16) },
  slaSub: { marginTop: vs(2), fontSize: ms(13.5) },
  stepper: { marginTop: vs(22), marginHorizontal: -s(6) },
  media: { flexDirection: 'row', gap: s(10) },
  facts: { marginTop: vs(14) },
  update: { flexDirection: 'row', gap: s(12), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  updateHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  updateText: { marginTop: vs(4) },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  composer: { flex: 1, height: vs(54), borderRadius: ms(18), backgroundColor: colors.sunk, paddingHorizontal: s(16), justifyContent: 'center' },
  composerInput: { fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
  camBtn: { borderRadius: ms(18) },
  resolve: { marginTop: vs(12) },
  flex: { flex: 1 },
});
