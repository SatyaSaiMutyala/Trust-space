/* Ticket detail (design p.8) from GET /tickets/:id: chips, SLA ring card, six-step tracker, photos, facts, the
   updates log, "Add an update" (with an optional status change) and Mark resolved. */
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs, fonts } from '../../theme';
import { Screen, AppText, Header, IconButton, Chip, Ring, Stepper, SectionHeader, PhotoTile, KeyValueRow, Footer, Button, Avatar, Skeleton, ErrorState, BottomSheet, Dropdown, ConfirmDialog, PhotoPickerSheet, usePhotoPicker } from '../../components';
import { uploadAll } from '../../store/uploads';
import { useOneQuery, usePatchRecordMutation, errorMessage, inr, slaDue, slaText, PRI_LABEL, SLA_HOURS, fileUrl, fmtDate } from '../../store/api';
import { useLookup, useAppSelector } from '../../store/hooks';

const PRI_TONE = { P1: 'coral', P2: 'amber', P3: 'blue', P4: 'grey' };
const STATUSES = ['Open', 'Assigned', 'In progress', 'Awaiting owner', 'Resolved', 'Closed'];
const STEP_LABEL = { Open: 'Open', Assigned: 'Assigned', 'In progress': 'In progress', 'Awaiting owner': 'With owner', Resolved: 'Resolved', Closed: 'Closed' };
const RESP = { Owner: "Owner's fixture", TrustLab: 'Tenant fixes', Shared: 'Shared' };
const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const when = iso => { const d = new Date(iso); return `${fmtDate(iso.slice(0, 10))}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export default function TicketDetailScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { user, role, mediaToken } = useAppSelector(st => st.auth);
  const { data, isLoading, error, refetch } = useOneQuery({ resource: 'tickets', id }, { skip: !id });
  const [patch, patchState] = usePatchRecordMutation();
  const props = useLookup('properties');
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState(false);
  const [status, setStatus] = useState(null);
  const [askResolve, setAskResolve] = useState(false);
  const [err, setErr] = useState('');
  const [pick, pickerProps] = usePhotoPicker();
  const [uploading, setUploading] = useState(false);
  const t = data?.data;
  const now = new Date();
  const done = t && ['Resolved', 'Closed'].includes(t.status);
  const ix = t ? STATUSES.indexOf(t.status) : 0;
  const elapsed = t ? Math.min(1, (now - new Date(t.createdAt)) / ((SLA_HOURS[t.priority] || 72) * 3600e3)) : 0;
  const due = t ? slaDue(t) : null;
  const photos = t ? [...(t.photos || []), ...(t.log || []).flatMap(l => l.photos || [])] : [];
  const addPhotos = async () => {
    const files = await pick({ multiple: true, title: 'Add photos' });
    if (files.error) { setErr(files.error); return; }
    if (!files.length) return;
    setUploading(true); setErr('');
    try {
      const assets = await uploadAll(files);
      const entry = { at: new Date().toISOString(), by: user?.name || 'Staff', text: `${assets.length} photo${assets.length === 1 ? '' : 's'} added`, photos: assets.map(a => a.id) };
      await patch({ resource: 'tickets', id: t.id, body: { photos: [...(t.photos || []), ...assets.map(a => a.id)], log: [...(t.log || []), entry] } }).unwrap();
    } catch (e) { setErr(e.message || errorMessage(e)); } finally { setUploading(false); }
  };
  const save = async (ns, note) => {
    setErr('');
    const entry = { at: new Date().toISOString(), by: user?.name || 'Staff', text: note || (ns && ns !== t.status ? `Status changed to ${ns}` : '') };
    if (ns && ns !== t.status) entry.status = ns;
    const body = { log: [...(t.log || []), entry] };
    if (ns && ns !== t.status) { body.status = ns; if (['Resolved', 'Closed'].includes(ns) && !t.resolvedAt) body.resolvedAt = entry.at; }
    try { await patch({ resource: 'tickets', id: t.id, body }).unwrap(); setText(''); setSheet(false); setStatus(null); } catch (e) { setErr(errorMessage(e)); }
  };
  return (
    <Screen footer={t && !done ? (
      <Footer stacked hint={err || undefined} hintColor="coralInk">
        <View style={styles.composerRow}>
          <View style={styles.composer}>
            <TextInput value={text} onChangeText={setText} placeholder="Add an update" placeholderTextColor={colors.muted} style={styles.composerInput} accessibilityLabel="Add an update" onSubmitEditing={() => text.trim() && save(null, text.trim())} returnKeyType="send" />
          </View>
          <IconButton name={text.trim() ? 'arrow-right' : 'camera'} variant={text.trim() ? 'teal' : 'sunk'} size={54} iconSize={24} color={text.trim() ? colors.white : colors.teal} onPress={() => (text.trim() ? save(null, text.trim()) : addPhotos())} accessibilityLabel={text.trim() ? 'Send update' : 'Add photo'} style={styles.camBtn} />
        </View>
        <View style={styles.footBtns}>
          <Button title="Change status" variant="secondary" onPress={() => setSheet(true)} />
          <Button title="Mark resolved" variant="primary" full onPress={() => setAskResolve(true)} loading={patchState.isLoading} />
        </View>
      </Footer>
    ) : null}>
      {isLoading ? <><Header heading="Ticket" /><Skeleton h={90} r={20} style={styles.skel} /><Skeleton h={200} r={20} style={styles.skel} /></>
        : error || !t ? <><Header heading="Ticket" /><ErrorState title="Couldn't load this ticket" body={errorMessage(error)} action="Try again" onAction={refetch} /></> : (
          <>
            <Header heading={t.title} sub={`${t.no} · ${props.name(t.propertyId)}`} />
            <View style={styles.chips}>
              <Chip label={PRI_LABEL[t.priority] || t.priority} tone={PRI_TONE[t.priority] || 'grey'} />
              <Chip label={STEP_LABEL[t.status] || t.status} tone={done ? 'teal' : t.status === 'Awaiting owner' ? 'amber' : 'blue'} />
              {t.responsibility ? <Chip label={RESP[t.responsibility] || t.responsibility} tone="grey" /> : null}
              {t.category ? <Chip label={t.category} tone="grey" dot={false} /> : null}
            </View>
            {!done ? (
              <View style={[styles.sla, due < now && styles.slaLate]}>
                <Ring size={52} stroke={6} value={elapsed} color={due < now ? colors.coral : colors.amber} track={due < now ? 'rgba(194,65,12,0.25)' : undefined} />
                <View style={styles.flex}>
                  <AppText variant="monoLg" color={due < now ? 'coralInk' : 'amberInk'}>{slaText(t, now)}</AppText>
                  <AppText variant="body" color={due < now ? 'coralInk' : 'amberInk'} style={styles.slaSub}>{SLA_HOURS[t.priority] || 72}-hour SLA {due < now ? 'ended' : 'ends'} {when(due.toISOString())}</AppText>
                </View>
              </View>
            ) : (
              <View style={[styles.sla, styles.slaDone]}>
                <AppText variant="body" color="tealInk">{t.status} {t.resolvedAt ? `on ${fmtDate(t.resolvedAt.slice(0, 10))}` : ''}{due && t.resolvedAt && new Date(t.resolvedAt) > due ? ' · after the SLA' : ' · within the SLA'}</AppText>
              </View>
            )}
            <Stepper steps={STATUSES.map((st, k) => ({ label: STEP_LABEL[st], state: k < ix || done ? 'done' : k === ix ? 'current' : 'todo' }))} ring="teal" size={24} style={styles.stepper} />
            <SectionHeader title="Photos" action={photos.length ? `${photos.length}` : 'None yet'} actionColor="muted" />
            <View style={styles.media}>
              {photos.slice(-2).map(p => <PhotoTile key={p.id || p} height={102} radius={18} uri={fileUrl(p.id || p, mediaToken)} />)}
              {!done ? <PhotoTile height={102} radius={18} state="capture" label={uploading ? 'Uploading…' : photos.length > 2 ? `+${photos.length - 2} · Add` : 'Add photo'} onPress={uploading ? undefined : addPhotos} /> : null}
            </View>
            <View style={styles.facts}>
              <KeyValueRow label="Who fixes it" value={`${RESP[t.responsibility] || t.responsibility || '—'}${t.assignee ? `, ${t.assignee}` : ''}`} mono={false} size="lg" />
              <KeyValueRow label="Estimated cost" value={t.cost ? inr(t.cost) : '—'} size="lg" />
              <KeyValueRow label="Paid by" value={t.costBy || '—'} mono={false} size="lg" />
              <KeyValueRow label="Raised" value={`${when(t.createdAt)}${t.raisedBy ? ` by ${t.raisedBy}` : ''}`} mono={false} size="lg" divider={false} />
            </View>
            <SectionHeader title="Updates" />
            {(t.log || []).slice().reverse().map((u, i) => (
              <View key={i} style={styles.update}>
                <Avatar initials={initials(u.by)} tone={i ? 'mist' : 'teal'} size={36} />
                <View style={styles.flex}>
                  <View style={styles.updateHead}>
                    <AppText variant="smallSemi">{u.by}</AppText>
                    <AppText variant="small" color="muted">{when(u.at)}</AppText>
                  </View>
                  {u.status ? <Chip label={STEP_LABEL[u.status] || u.status} tone="grey" size="sm" style={styles.updateChip} /> : null}
                  {u.text ? <AppText variant="body" style={styles.updateText}>{u.text}</AppText> : null}
                </View>
              </View>
            ))}
            {!(t.log || []).length ? <AppText variant="body" color="muted">No updates yet.</AppText> : null}
          </>
        )}
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Update ticket">
        <Dropdown label="Status" value={status || t?.status} options={STATUSES.map(st => ({ label: STEP_LABEL[st], value: st }))} onSelect={setStatus} style={styles.sheetField} />
        <View style={styles.sheetBtns}>
          <Button title="Cancel" variant="secondary" full onPress={() => setSheet(false)} />
          <Button title="Save" variant="primary" full onPress={() => save(status || t.status, text.trim())} loading={patchState.isLoading} />
        </View>
      </BottomSheet>
      <PhotoPickerSheet {...pickerProps} />
      <ConfirmDialog open={askResolve} icon="check-circle" title="Mark as resolved?" text="The owner and the team see it as fixed. You can still add updates until it is closed." confirmLabel="Resolve" loading={patchState.isLoading} onCancel={() => setAskResolve(false)} onConfirm={async () => { await save('Resolved', text.trim() || 'Resolved'); setAskResolve(false); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  skel: { marginTop: vs(14) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginTop: vs(8) },
  sla: { flexDirection: 'row', alignItems: 'center', gap: s(16), backgroundColor: colors.amberTint, borderRadius: ms(20), padding: s(18), marginTop: vs(16) },
  slaLate: { backgroundColor: colors.coralTint },
  slaDone: { backgroundColor: colors.tealTint },
  slaSub: { marginTop: vs(2), fontSize: ms(13.5) },
  stepper: { marginTop: vs(22), marginHorizontal: -s(6) },
  media: { flexDirection: 'row', gap: s(10) },
  facts: { marginTop: vs(14) },
  update: { flexDirection: 'row', gap: s(12), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  updateHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  updateChip: { marginTop: vs(6) },
  updateText: { marginTop: vs(4) },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  composer: { flex: 1, height: vs(50), borderRadius: ms(16), backgroundColor: colors.sunk, paddingHorizontal: s(16), justifyContent: 'center' },
  composerInput: { fontFamily: fonts.body, fontSize: ms(15), color: colors.ink, paddingVertical: 0 },
  camBtn: { borderRadius: ms(16) },
  footBtns: { flexDirection: 'row', gap: s(10), marginTop: vs(10) },
  sheetField: { marginTop: vs(6) },
  sheetBtns: { flexDirection: 'row', gap: s(12), marginTop: vs(16) },
  flex: { flex: 1 },
});
