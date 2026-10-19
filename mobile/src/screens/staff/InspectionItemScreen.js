/* Inspection item (design p.11): photo header with close / camera and, on a handover, the Take-over / Today toggle;
   white sheet with the section's progress, the item, condition chips (or the value for counts and readings),
   Who pays? on a flagged handover item, remarks; Skip / Save, next item. Saves queue on the phone and upload later. */
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, IconButton, Segmented, ProgressSegments, ChoiceChip, Input, Footer, Button, PhotoGradient, Chip, Arch, PhotoPickerSheet, usePhotoPicker, Skeleton } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useInspection, nextItemKey } from '../../store/useInspection';
import { CONDS, BADC } from '../../../../shared/calc/inspection.js';
import { COND_TONE, RESP_OPTIONS, photoUri, itemDone, fmtTime } from './inspectionUi';

export default function InspectionItemScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { id, k } = route.params || {};
  const { mediaToken } = useAppSelector(st => st.auth);
  const { view, inspection: I, isLoading, saveItem, addPhotos } = useInspection(id);
  const sec = view?.sections.find(x => x.items.some(it => it.k === k));
  const it = sec?.items.find(x => x.k === k);
  const [when, setWhen] = useState('today');
  const [form, setForm] = useState(null); // { cond, val, remark, resp, deduct, label, qty }
  const [pick, pickerProps] = usePhotoPicker();
  const [err, setErr] = useState('');
  useEffect(() => { if (it && (!form || form.k !== k)) setForm({ k, cond: it.cond || '', val: it.val || '', remark: it.remark || '', resp: it.resp || '', deduct: it.deduct ? String(it.deduct) : '', label: it.label || '', qty: it.qty != null ? String(it.qty) : '1' }); }, [it, k, form]);
  const canEdit = !!view?.canEdit;
  const set = key => v => setForm(x => ({ ...x, [key]: v }));
  const bad = form ? BADC(form.cond) : false;
  const needsPayer = I?.kind === 'Move-out' && bad;
  const photos = it?.photos || [];
  const first = photos[0];
  const takePhoto = async () => {
    const files = await pick({ multiple: true, title: it.label });
    if (files.error) { setErr(files.error); return; }
    addPhotos(k, files);
  };
  const goNext = () => { const nk = nextItemKey(view, k); if (nk) nav.replace('InspectionItem', { id, k: nk }); else nav.goBack(); };
  const save = () => {
    if (!form) return;
    const body = {};
    if (it.type === 'cond' || it.type === 'fixture') body.cond = form.cond;
    if (it.type === 'count' || it.type === 'reading') body.val = form.val.trim();
    if (it.type === 'fixture') { body.label = form.label.trim(); body.qty = +form.qty || 0; }
    body.remark = form.remark.trim();
    if (needsPayer) { body.resp = form.resp; body.deduct = form.resp === 'TrustLab' ? +form.deduct || 0 : 0; }
    if (bad && !body.remark) { setErr('Describe the issue — the owner sees this remark.'); return; }
    if (needsPayer && !form.resp) { setErr('Choose who pays for this.'); return; }
    setErr(''); saveItem(k, body); goNext();
  };
  const done = sec ? sec.items.filter(itemDone).length : 0;
  const prev = it?.prev;
  return (
    <Screen padded={false} edges={['left', 'right']} footer={canEdit && it ? (
      <Footer hint={err || undefined} hintColor="coralInk" hintWeight="semibold">
        <Button title="Skip" variant="secondary" onPress={goNext} style={styles.skip} />
        <Button title="Save, next item" variant="primary" full onPress={save} />
      </Footer>
    ) : null}>
      <View style={styles.photo}>
        {first && photoUri(first, mediaToken) ? <Image source={{ uri: photoUri(first, mediaToken) }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        <PhotoGradient dark />
        <View style={styles.photoBar}>
          <IconButton name="x" variant="dark" onPress={() => nav.goBack()} accessibilityLabel="Close" />
          <View style={styles.flex}>
            <AppText variant="title" color="white" numberOfLines={1}>{sec?.s || 'Checklist'}</AppText>
            <AppText variant="small" color={colors.onTealMuted}>{sec ? `${done} of ${sec.total} done` : ''}{photos.length ? ` · ${photos.length} photo${photos.length === 1 ? '' : 's'}` : ''}</AppText>
          </View>
          {canEdit ? <IconButton name="camera" variant="dark" onPress={takePhoto} accessibilityLabel="Take photo" /> : null}
        </View>
        {I?.kind === 'Move-out' && prev ? <Segmented tone="dark" shape="pill" compact value={when} onChange={setWhen} style={styles.toggle} options={[{ label: 'Take-over', value: 'takeover' }, { label: 'Today', value: 'today' }]} /> : null}
        {first?.local ? <View style={styles.waitChip}><AppText variant="captionSemi" color="white">Photo saved on this phone</AppText></View> : null}
      </View>
      <View style={styles.sheet}>
        {isLoading || !it || !form ? <Skeleton h={120} r={20} style={styles.group} /> : when === 'takeover' && prev ? (
          <>
            <ProgressSegments items={sec.items.map(x => ({ value: itemDone(x) ? 1 : 0 }))} height={7} />
            <AppText variant="body" color="muted" style={styles.group}>At take-over</AppText>
            <AppText variant="h1" style={styles.item}>{it.label}</AppText>
            <View style={styles.choices}>{prev.cond ? <Chip label={prev.cond} tone={COND_TONE[prev.cond]} /> : null}{prev.val ? <Chip label={String(prev.val)} tone="grey" dot={false} /> : null}</View>
            {prev.remark ? <AppText variant="body" color="muted" style={styles.takeover}>{prev.remark}</AppText> : null}
            {(prev.photos || []).length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripInner}>
                {prev.photos.map((p, i) => <Arch key={i} photo width={84} height={92} bottomRadius={14} uri={photoUri(p, mediaToken)} />)}
              </ScrollView>
            ) : <AppText variant="small" color="muted" style={styles.takeover}>No take-over photos for this item.</AppText>}
          </>
        ) : (
          <>
            <ProgressSegments items={sec.items.map(x => ({ value: itemDone(x) ? 1 : 0 }))} height={7} />
            <AppText variant="body" color="muted" style={styles.group}>{sec.s}</AppText>
            {it.type === 'fixture' ? (
              <View style={styles.fixRow}>
                <Input label="Fixture" value={form.label} onChangeText={set('label')} placeholder="e.g. Ceiling fans" autoCapitalize="sentences" editable={canEdit && !prev} style={styles.flex} />
                <Input label="Qty" value={form.qty} onChangeText={set('qty')} keyboardType="number-pad" editable={canEdit} style={styles.qty} />
              </View>
            ) : <AppText variant="h1" style={styles.item}>{it.label}</AppText>}
            {prev && prev.cond ? <AppText variant="body" color="muted" style={styles.takeover}>At take-over: <AppText variant="bodySemi" color="teal">{prev.cond}</AppText>{prev.remark ? `, ${prev.remark}` : ''}</AppText> : null}
            {it.type === 'count' || it.type === 'reading' ? (
              <>
                <AppText variant="h4" weight="semibold" style={styles.label}>{it.type === 'count' ? 'How many?' : 'Reading'}</AppText>
                <Input value={form.val} onChangeText={set('val')} placeholder={it.type === 'count' ? 'Number' : 'As on the meter'} keyboardType="decimal-pad" editable={canEdit} />
              </>
            ) : (
              <>
                <AppText variant="h4" weight="semibold" style={styles.label}>{I.kind === 'Move-out' ? 'Condition today' : 'Condition'}</AppText>
                <View style={styles.choices}>{CONDS.map(c => <ChoiceChip key={c} label={c} tone={COND_TONE[c]} selected={form.cond === c} onPress={() => canEdit && set('cond')(form.cond === c ? '' : c)} />)}</View>
              </>
            )}
            {needsPayer ? (
              <>
                <AppText variant="h4" weight="semibold" style={styles.label}>Who pays?</AppText>
                <Segmented value={form.resp} onChange={canEdit ? set('resp') : undefined} options={RESP_OPTIONS} />
                {form.resp === 'TrustLab' ? <Input label="Agreed deduction (₹)" value={form.deduct} onChangeText={set('deduct')} keyboardType="number-pad" prefix="₹" editable={canEdit} style={styles.deduct} /> : null}
              </>
            ) : null}
            <AppText variant="h4" weight="semibold" style={styles.label}>Remarks{bad ? ' (required)' : ''}</AppText>
            <Input value={form.remark} onChangeText={set('remark')} multiline placeholder={bad ? 'Describe the issue' : 'What did you see?'} autoCapitalize="sentences" editable={canEdit} />
            {it.req && !photos.length ? <AppText variant="small" color="amberInk" style={styles.takeover}>A photo is required for this item — tap the camera above.</AppText> : null}
            {photos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripInner}>
                {photos.map((p, i) => (
                  <Arch key={i} photo width={84} height={92} bottomRadius={14} uri={photoUri(p, mediaToken)}>
                    {p.local ? <View style={styles.waiting}><AppText variant="captionSemi" color="white">Waiting</AppText></View> : null}
                  </Arch>
                ))}
              </ScrollView>
            ) : null}
            {it.photos?.length && it.photos[it.photos.length - 1].at ? <AppText variant="caption" color="muted">Last photo {fmtTime(it.photos[it.photos.length - 1].at)}</AppText> : null}
          </>
        )}
        <View style={styles.space} />
      </View>
      <PhotoPickerSheet {...pickerProps} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { height: vs(260), backgroundColor: colors.photoDark, overflow: 'hidden' },
  photoBar: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(14), paddingTop: vs(54) },
  toggle: { position: 'absolute', bottom: vs(26), alignSelf: 'center', width: s(200) },
  waitChip: { position: 'absolute', bottom: vs(30), right: s(14), backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(10), paddingVertical: vs(3) },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: ms(28), borderTopRightRadius: ms(28), marginTop: -vs(24), paddingHorizontal: gutter, paddingTop: vs(20) },
  group: { marginTop: vs(22), fontSize: ms(15) },
  item: { marginTop: vs(2) },
  takeover: { marginTop: vs(6), fontSize: ms(15) },
  label: { marginTop: vs(24), marginBottom: vs(12), fontSize: ms(17) },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginTop: vs(6) },
  fixRow: { flexDirection: 'row', gap: s(12), marginTop: vs(8) },
  qty: { width: s(90) },
  deduct: { marginTop: vs(12) },
  strip: { marginTop: vs(14) },
  stripInner: { gap: s(10) },
  waiting: { position: 'absolute', bottom: 6, alignSelf: 'center', backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(8), paddingVertical: 2 },
  skip: { paddingHorizontal: s(22) },
  space: { height: vs(24) },
  flex: { flex: 1 },
});
