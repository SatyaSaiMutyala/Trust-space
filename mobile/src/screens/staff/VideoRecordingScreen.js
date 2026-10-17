/* Video recording (design p.13): dark camera view, REC pill, Facilities done / Owner recording cards, read-aloud card,
   camera / record / limits bar. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, IconButton, Icon } from '../../components';
import { video } from '../../mock/data';

function PartyCard({ title, sub, done, active }) {
  return (
    <View style={[styles.party, active && styles.partyActive]}>
      <View style={[styles.partyIcon, { backgroundColor: done ? '#9ED9CF' : colors.coral }]}>
        {done ? <Icon name="check" size={18} color={colors.deepTeal} strokeWidth={2.6} /> : <View style={styles.recDot} />}
      </View>
      <View>
        <AppText variant="title" color="white">{title}</AppText>
        <AppText variant="small" color={colors.onTealMuted} style={styles.partySub}>{sub}</AppText>
      </View>
    </View>
  );
}

export default function VideoRecordingScreen() {
  const nav = useNavigation();
  return (
    <Screen bg="dark" padded={false} scroll={false}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs><RadialGradient id="r" cx="50%" cy="45%" r="60%"><Stop offset="0" stopColor="#2E4A45" /><Stop offset="1" stopColor="#111E1C" /></RadialGradient></Defs>
        <Rect width="100" height="100" fill="url(#r)" />
        <Circle cx="50" cy="38" r="18" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" fill="none" />
        <Circle cx="50" cy="62" r="18" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" fill="none" />
      </Svg>
      <View style={styles.top}>
        <IconButton name="chevron-left" variant="dark" onPress={() => nav.goBack()} accessibilityLabel="Back" />
        <View style={styles.rec}><View style={styles.recDotSm} /><AppText variant="monoMd" weight="semibold" color="white">{video.rec}</AppText></View>
      </View>
      <View style={styles.parties}>
        <PartyCard {...video.tenant} done />
        <PartyCard {...video.owner} active />
      </View>
      <View style={styles.flex} />
      <View style={styles.readCard}>
        <AppText variant="title" color={colors.amber}>{video.prompt}</AppText>
        <AppText variant="h4" color="white" style={styles.readText}>{video.text}</AppText>
      </View>
      <View style={styles.bottom}>
        <IconButton name="camera" variant="dark" size={56} iconSize={24} onPress={() => {}} accessibilityLabel="Switch camera" style={styles.camBtn} />
        <Pressable style={styles.record} accessibilityRole="button" accessibilityLabel="Stop recording" onPress={() => nav.navigate('SignOff')}><View style={styles.stop} /></Pressable>
        <AppText variant="mono" color={colors.onTealMuted} center style={styles.limits}>{video.limits}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(16), paddingTop: vs(6) },
  rec: { flexDirection: 'row', alignItems: 'center', gap: s(10), backgroundColor: colors.coral, borderRadius: 999, paddingHorizontal: s(16), height: vs(36) },
  recDotSm: { width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: colors.white },
  parties: { flexDirection: 'row', gap: s(10), paddingHorizontal: s(16), marginTop: vs(20) },
  party: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: ms(18), padding: s(12), borderWidth: 2, borderColor: 'transparent' },
  partyActive: { borderColor: '#9ED9CF' },
  partyIcon: { width: ms(30), height: ms(30), borderRadius: ms(15), alignItems: 'center', justifyContent: 'center' },
  recDot: { width: ms(10), height: ms(10), borderRadius: ms(5), backgroundColor: colors.white },
  partySub: { fontSize: ms(13) },
  readCard: { marginHorizontal: s(16), backgroundColor: 'rgba(14,26,24,0.82)', borderRadius: ms(24), padding: s(18), borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  readText: { marginTop: vs(10), fontSize: ms(18), lineHeight: ms(28) },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter + s(24), paddingVertical: vs(28) },
  camBtn: {},
  record: { width: ms(80), height: ms(80), borderRadius: ms(40), borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stop: { width: ms(30), height: ms(30), borderRadius: ms(8), backgroundColor: colors.coral },
  limits: { width: s(70) },
  flex: { flex: 1 },
});
