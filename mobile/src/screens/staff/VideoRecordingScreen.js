/* Video confirmations (design p.13): dark camera-style screen, one card per party (facilities done / owner recording),
   the words to say on camera, then the record button (opens the phone camera for a 5 s – 2 min clip, under 20 MB).
   The owner's clip is recorded at sign-off, once the record has been sent to them. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, IconButton, Icon, recordVideo } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useInspection } from '../../store/useInspection';
import { fmtDate } from '../../store/api';
import { secs } from './inspectionUi';

function PartyCard({ title, sub, done, active, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: active, disabled }} style={[styles.party, active && styles.partyActive, disabled && styles.partyOff]}>
      <View style={[styles.partyIcon, { backgroundColor: done ? '#9ED9CF' : colors.coral }]}>
        {done ? <Icon name="check" size={18} color={colors.deepTeal} strokeWidth={2.6} /> : <View style={styles.recDot} />}
      </View>
      <View style={styles.flex}>
        <AppText variant="title" color="white">{title}</AppText>
        <AppText variant="small" color={colors.onTealMuted} style={styles.partySub} numberOfLines={2}>{sub}</AppText>
      </View>
    </Pressable>
  );
}

export default function VideoRecordingScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { role } = useAppSelector(st => st.auth);
  const { view, inspection: I, setVideo } = useInspection(id);
  const owner = role === 'owner';
  const ownerAllowed = !!view && (owner ? view.canOwnerVideo : view.canOwnerVideo || I.status === 'Signed');
  const tenantAllowed = !!view && !owner && view.canEdit;
  const [who, setWho] = useState(owner ? 'owner' : 'tdpl');
  const [front, setFront] = useState(owner);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (view && who === 'tdpl' && !tenantAllowed && ownerAllowed) setWho('owner');
  const P = view?.property; const date = I?.date ? fmtDate(I.date) : 'today';
  const take = I?.kind === 'Move-in';
  const script = who === 'tdpl'
    ? `“I, ${I?.inspector || '[name]'}, for the tenant, inspected ${P?.name || 'the premises'} jointly with the owner on ${date}. The condition of every item is as recorded in TruSpace.”`
    : `“I, ${I?.ownerRep || view?.ownerName || '[owner name]'}, owner of ${P?.name || 'the premises'}, inspected the premises jointly with the tenant on ${date}, and confirm the premises are ${take ? 'handed over to the tenant' : 'handed back to me'} in the condition recorded.”`;
  const canRecord = who === 'tdpl' ? tenantAllowed : ownerAllowed;
  const record = async () => {
    if (!canRecord || busy) return;
    setErr(''); setBusy(true);
    try {
      const f = await recordVideo({ front });
      if (!f) return;
      if (f.duration && f.duration < 5) { setErr('Too short — record at least 5 seconds.'); return; }
      if (f.duration && f.duration > 120) { setErr('Keep the video under 2 minutes.'); return; }
      if (f.size && f.size > 20e6) { setErr(`Video is ${(f.size / 1e6).toFixed(0)} MB — the limit is 20 MB. Record a shorter clip.`); return; }
      setVideo(who, f);
      if (who === 'tdpl' && ownerAllowed && !I.ownerVideo) setWho('owner'); else nav.navigate('SignOff', { id });
    } catch (e) { setErr(e.message || 'Could not open the camera.'); } finally { setBusy(false); }
  };
  const vid = w => (w === 'tdpl' ? I?.tdplVideo : I?.ownerVideo);
  const sub = w => { const v = vid(w); if (v) return `${v.pending ? 'Saved on this phone' : 'Recorded'} · ${secs(v.dur)}`; if (w === 'owner' && !ownerAllowed) return owner ? 'Once the record is sent to you' : 'At sign-off, after sending'; return w === who ? 'Recording next' : 'To record'; };
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
        <View style={styles.rec}><View style={styles.recDotSm} /><AppText variant="monoMd" weight="semibold" color="white">{busy ? 'REC' : vid('tdpl') && vid('owner') ? 'DONE' : 'READY'}</AppText></View>
        <Pressable onPress={() => nav.navigate('SignOff', { id })} hitSlop={8} accessibilityRole="button"><AppText variant="title" color={colors.onTealMuted}>Sign-off</AppText></Pressable>
      </View>
      <View style={styles.parties}>
        <PartyCard title="Facilities" sub={sub('tdpl')} done={!!vid('tdpl')} active={who === 'tdpl'} onPress={() => setWho('tdpl')} disabled={owner} />
        <PartyCard title="Owner" sub={sub('owner')} done={!!vid('owner')} active={who === 'owner'} onPress={() => setWho('owner')} disabled={!ownerAllowed && !vid('owner')} />
      </View>
      <View style={styles.flex} />
      <View style={styles.readCard}>
        <AppText variant="title" color={colors.amber}>{who === 'tdpl' ? 'Facilities, say on camera:' : 'Owner, say on camera:'}</AppText>
        <AppText variant="h4" color="white" style={styles.readText}>{script}</AppText>
        {err ? <AppText variant="small" color={colors.coral} style={styles.err}>{err}</AppText> : !canRecord ? <AppText variant="small" color={colors.onTealMuted} style={styles.err}>{who === 'owner' ? 'The owner records after the inspection is sent to them.' : 'This record is locked.'}</AppText> : null}
      </View>
      <View style={styles.bottom}>
        <IconButton name="camera" variant="dark" size={56} iconSize={24} onPress={() => setFront(v => !v)} accessibilityLabel={front ? 'Use back camera' : 'Use front camera'} />
        <Pressable style={[styles.record, !canRecord && styles.recordOff]} accessibilityRole="button" accessibilityLabel="Record video" onPress={record} disabled={!canRecord || busy}><View style={styles.stop} /></Pressable>
        <AppText variant="mono" color={colors.onTealMuted} center style={styles.limits}>5 s – 2 min{'\n'}under 20 MB</AppText>
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
  partyOff: { opacity: 0.55 },
  partyIcon: { width: ms(30), height: ms(30), borderRadius: ms(15), alignItems: 'center', justifyContent: 'center' },
  recDot: { width: ms(10), height: ms(10), borderRadius: ms(5), backgroundColor: colors.white },
  partySub: { fontSize: ms(13) },
  readCard: { marginHorizontal: s(16), backgroundColor: 'rgba(14,26,24,0.82)', borderRadius: ms(24), padding: s(18), borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  readText: { marginTop: vs(10), fontSize: ms(18), lineHeight: ms(28) },
  err: { marginTop: vs(10) },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter + s(24), paddingVertical: vs(28) },
  record: { width: ms(80), height: ms(80), borderRadius: ms(40), borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  recordOff: { opacity: 0.4 },
  stop: { width: ms(30), height: ms(30), borderRadius: ms(15), backgroundColor: colors.coral },
  limits: { width: s(70) },
  flex: { flex: 1 },
});
