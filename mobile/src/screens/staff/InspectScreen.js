/* Inspect tab (design p.10) from GET /mobile/inspections: what is waiting to be uploaded from this phone, the leases
   that still need a take-over or handover (Start an inspection), then every record: in progress, with the owner,
   completed. */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button, BottomSheet, Skeleton, ErrorState, EmptyState, Icon } from '../../components';
import { useInspectionsQuery, useStartInspectionMutation, errorMessage, fmtDate } from '../../store/api';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { pendingOf, setLastError } from '../../store/slices/offlineSlice';
import { flushQueue } from '../../store/offline';
import { STATUS_TONE, STATUS_LABEL, kindLabel } from './inspectionUi';

/** Which records are "mine to finish on this phone": the ones with queued changes. */
function PendingCard({ pending, syncing, offline, lastError, onRetry, onDismiss }) {
  if (!pending.total && !lastError) return null;
  return (
    <View style={[styles.pending, lastError && !pending.total && styles.pendingErr]}>
      <Icon name={lastError && !pending.total ? 'alert-triangle' : offline ? 'wifi-off' : 'upload'} size={22} color={lastError && !pending.total ? colors.coralInk : colors.amberInk} />
      <View style={styles.flex}>
        {pending.total ? <AppText variant="bodySemi">{pending.changes ? `${pending.changes} change${pending.changes === 1 ? '' : 's'}` : ''}{pending.changes && pending.photos ? ' and ' : ''}{pending.photos ? `${pending.photos} photo${pending.photos === 1 ? '' : 's'}` : ''} saved on this phone</AppText> : null}
        <AppText variant="small" color={lastError ? 'coralInk' : 'muted'}>{lastError || (syncing ? 'Uploading now…' : offline ? 'They will upload when you are back online.' : 'Waiting to upload.')}</AppText>
      </View>
      {pending.total && !syncing ? <Pressable onPress={onRetry} hitSlop={8}><AppText variant="title" color="teal">Upload now</AppText></Pressable> : lastError && !pending.total ? <Pressable onPress={onDismiss} hitSlop={8}><AppText variant="title" color="muted">OK</AppText></Pressable> : null}
    </View>
  );
}

export default function InspectScreen() {
  const nav = useNavigation();
  const dispatch = useAppDispatch();
  const { data, isLoading, error, refetch, isFetching } = useInspectionsQuery();
  const [start, startState] = useStartInspectionMutation();
  const [pickOpen, setPickOpen] = useState(false);
  const [err, setErr] = useState('');
  const { queue, syncing, lastError } = useAppSelector(st => st.offline);
  const offline = useAppSelector(st => st.ui.offline);
  const pending = useMemo(() => pendingOf({ offline: { queue } }), [queue]);
  const pendingIds = useMemo(() => new Set(queue.map(o => o.inspId)), [queue]);
  const d = data?.data;
  const open = (d?.records || []).filter(r => ['Not started', 'In progress', 'Disputed'].includes(r.status));
  const waiting = (d?.records || []).filter(r => r.status === 'Awaiting owner sign-off');
  const done = (d?.records || []).filter(r => r.status === 'Signed');
  const begin = async t => {
    setErr('');
    try { const r = await start({ leaseId: t.leaseId, kind: t.kind }).unwrap(); setPickOpen(false); nav.navigate('InspectionHub', { id: r.data.inspection.id }); }
    catch (e) { setErr(errorMessage(e)); }
  };
  const row = (r, i, arr) => (
    <ListRow key={r.id} title={`${r.propertyName} ${kindLabel(r.kind)}`}
      sub={[r.city, r.status === 'Signed' ? `Done ${fmtDate(r.date)} · signed by both` : `${r.progress.done} of ${r.progress.total} done`, pendingIds.has(r.id) ? 'saved on this phone' : r.issues ? `${r.issues} issue${r.issues === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}
      right={<Chip label={pendingIds.has(r.id) && r.status !== 'Signed' ? 'Offline' : STATUS_LABEL[r.status] || r.status} tone={pendingIds.has(r.id) && r.status !== 'Signed' ? 'amber' : STATUS_TONE[r.status] || 'grey'} size="sm" />}
      chevron onPress={() => nav.navigate(r.status === 'Awaiting owner sign-off' || r.status === 'Signed' ? 'SignOff' : 'InspectionHub', { id: r.id })} divider={i < arr.length - 1} />
  );
  const group = (title, list) => (list.length ? (
    <View key={title}>
      <AppText variant="eyebrow" color="muted" style={styles.group}>{title.toUpperCase()}</AppText>
      {list.map(row)}
    </View>
  ) : null);
  return (
    <Screen tabs>
      <AppText variant="body" color="muted" style={styles.eyebrow}>{isLoading ? 'Loading…' : d ? data.message : ''}</AppText>
      <AppText variant="display">Inspections</AppText>
      <PendingCard pending={pending} syncing={syncing} offline={offline} lastError={lastError} onRetry={flushQueue} onDismiss={() => dispatch(setLastError(''))} />
      <Button title="Start an inspection" variant="primary" icon="plus" onPress={() => setPickOpen(true)} disabled={!d || !d.todo.length} style={styles.start} />
      {isLoading ? <><Skeleton h={64} r={16} style={styles.skel} /><Skeleton h={64} r={16} style={styles.skel} /></>
        : error && !d ? <ErrorState title="Couldn't load inspections" body={errorMessage(error)} action="Try again" onAction={refetch} />
          : !d?.records.length ? <EmptyState title="No inspections yet" body={d?.todo.length ? 'Start the take-over inspection when you receive the keys.' : 'Every lease has its take-over on record.'} action={d?.todo.length ? 'Start an inspection' : undefined} onAction={() => setPickOpen(true)} />
            : [group('In progress', open), group('Waiting for the owner', waiting), group('Completed', done)]}
      {isFetching && !isLoading ? <AppText variant="caption" color="muted" center style={styles.refreshing}>Refreshing…</AppText> : null}
      <BottomSheet open={pickOpen} onClose={() => setPickOpen(false)} title="Start an inspection">
        {(d?.todo || []).map((t, i, arr) => (
          <ListRow key={t.leaseId + t.kind} title={`${t.propertyName} ${kindLabel(t.kind)}`} sub={`${t.propertyCode} · ${t.note}`} right={<Chip label={t.kind === 'Move-in' ? 'Take-over' : 'Handover'} tone={t.kind === 'Move-in' ? 'teal' : 'amber'} dot={false} size="sm" />} chevron onPress={() => begin(t)} divider={i < arr.length - 1} />
        ))}
        {!d?.todo.length ? <AppText variant="body" color="muted" center style={styles.none}>Nothing to start: every lease has its inspections on record.</AppText> : null}
        {err ? <AppText variant="small" color="coralInk" center style={styles.none}>{err}</AppText> : null}
        {startState.isLoading ? <AppText variant="small" color="muted" center style={styles.none}>Starting…</AppText> : null}
        <View style={styles.space} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: vs(14), fontSize: ms(15) },
  start: { marginVertical: vs(18) },
  group: { marginTop: vs(18), marginBottom: vs(6) },
  skel: { marginTop: vs(12) },
  pending: { flexDirection: 'row', alignItems: 'center', gap: s(12), backgroundColor: colors.amberTint, borderRadius: ms(18), padding: s(14), marginTop: vs(16) },
  pendingErr: { backgroundColor: colors.coralTint },
  refreshing: { marginTop: vs(12) },
  none: { marginTop: vs(12) },
  space: { height: vs(8) },
  flex: { flex: 1 },
});
