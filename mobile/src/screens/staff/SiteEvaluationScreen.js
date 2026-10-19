/* Site evaluation (design p.6) from GET /mobile/sites/:id: photos, catchment index, measurements, the due-diligence
   checklist by section (tap an item to mark Pass / Concern / Fail / N/A with a remark → PATCH /sites/:id), and the
   stage actions (send for approval, approve, reject). */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs, gutter } from '../../theme';
import { Screen, AppText, Header, Icon, Chip, FilterChip, PhotoTile, Gauge, Footer, Button, SectionHeader, Skeleton, ErrorState, BottomSheet, ChoiceChip, Input, ConfirmDialog, PhotoPickerSheet, usePhotoPicker } from '../../components';
import { uploadAll } from '../../store/uploads';
import { useMobileSiteQuery, usePatchRecordMutation, errorMessage, inr, fmtDate, fileUrl } from '../../store/api';
import { useAppSelector } from '../../store/hooks';

const STAGE_TONE = { Scouted: 'grey', Scrutiny: 'blue', Shortlisted: 'blue', Negotiation: 'blue', Acceptance: 'amber', Approved: 'teal', Agreement: 'teal', 'Take-over': 'teal', Operational: 'teal', Opened: 'teal', 'On hold': 'grey', Rejected: 'coral' };
const V_TONE = { Pass: 'teal', Concern: 'amber', Fail: 'coral', 'N/A': 'grey' };
const CATCH_MAX = { Medical: 30, Residential: 30, Corporate: 10, Visibility: 15, Competition: 15 };

export default function SiteEvaluationScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { user, role, mediaToken } = useAppSelector(st => st.auth);
  const { data, isLoading, error, refetch } = useMobileSiteQuery(id, { skip: !id });
  const [patch, patchState] = usePatchRecordMutation();
  const [section, setSection] = useState(null);
  const [item, setItem] = useState(null);
  const [v, setV] = useState('');
  const [remark, setRemark] = useState('');
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(null); // { stage, title, text }
  const [err, setErr] = useState('');
  const [pick, pickerProps] = usePhotoPicker();
  const [uploading, setUploading] = useState('');
  const d = data?.data; const st = d?.site;
  const addPhotos = async kind => {
    const files = await pick({ multiple: kind === 'photos', video: kind === 'photos', title: kind === 'front' ? 'Front view of the building' : 'Site photos' });
    if (files.error) { setErr(files.error); return; }
    if (!files.length) return;
    setUploading(kind); setErr('');
    try {
      const assets = await uploadAll(files);
      const body = kind === 'front' ? { frontPhoto: assets[0].id } : { photos: [...(st.photos || []), ...assets.map(a => a.id)] };
      await patch({ resource: 'sites', id, body: { ...body, log: log(`${assets.length} ${kind === 'front' ? 'front-view photo' : 'photo(s)'} added`) } }).unwrap();
    } catch (e) { setErr(e.message || errorMessage(e)); } finally { setUploading(''); }
  };
  const staff = role === 'staff';
  const sections = d ? d.sections : [];
  const sec = section || sections[0];
  const items = d ? d.items.filter(i => i.sec === sec) : [];
  const log = text => [...(st.log || []), { at: new Date().toISOString(), by: user?.name || 'Staff', text }];
  const saveCheck = async () => {
    setErr('');
    try { await patch({ resource: 'sites', id, body: { checks: { ...(st.checks || {}), [item.k]: { ...(st.checks?.[item.k] || {}), v, remark: remark.trim() } } } }).unwrap(); setItem(null); } catch (e) { setErr(errorMessage(e)); }
  };
  const setStage = async (stage, text) => {
    setErr('');
    try { await patch({ resource: 'sites', id, body: { stage, log: log(text) } }).unwrap(); setConfirm(null); setReject(false); setReason(''); } catch (e) { setErr(errorMessage(e)); }
  };
  const measured = +st?.measuredArea || 0, quoted = +st?.area || 0;
  const diff = measured && quoted ? Math.round((measured - quoted) / quoted * 1000) / 10 : 0;
  const rentPsf = st && (+st.quotedRent) && (measured || quoted) ? Math.round((+st.quotedRent) / (measured || quoted) * 10) / 10 : 0;
  const stage = st?.stage || 'Scouted';
  const canSend = staff && ['Scouted', 'Scrutiny', 'Shortlisted', 'Negotiation'].includes(stage);
  const canApprove = staff && stage === 'Acceptance';
  const canReject = staff && !['Rejected', 'Approved', 'Agreement', 'Take-over', 'Operational', 'Opened'].includes(stage);
  const photos = st ? (st.photos || []) : [];
  return (
    <Screen padded={false} footer={st && (canSend || canApprove || canReject || role === 'franchise') ? (
      <Footer hint={err || (d.score.done < d.score.total ? `Still to do: ${d.score.total - d.score.done} checklist item${d.score.total - d.score.done === 1 ? '' : 's'}${d.catch.filled ? '' : ', catchment'}` : `${d.score.verdict} · ${d.score.pct}%`)} hintColor={err ? 'coralInk' : 'muted'}>
        {canReject ? <Button title="Reject" variant="danger" onPress={() => setReject(true)} /> : null}
        {canApprove ? <Button title="Approve site" variant="primary" full onPress={() => setConfirm({ stage: 'Approved', title: 'Approve this site?', text: 'It moves to the agreement stage and the partner is told.' })} disabled={d.score.crit.length > 0} /> : null}
        {canSend ? <Button title={stage === 'Negotiation' ? 'Send for approval' : 'Next stage'} variant="primary" full onPress={() => { const next = { Scouted: 'Scrutiny', Scrutiny: 'Shortlisted', Shortlisted: 'Negotiation', Negotiation: 'Acceptance' }[stage]; setConfirm({ stage: next, title: `Move to ${next}?`, text: next === 'Acceptance' ? 'Management will review the checklist and the terms.' : 'The site moves one step along the pipeline.' }); }} /> : null}
        {role === 'franchise' && stage === 'Scouted' ? <Button title="Send for review" variant="primary" full onPress={() => setConfirm({ stage: 'Scrutiny', title: 'Send for review?', text: 'The facilities team will visit and assess the site.' })} /> : null}
      </Footer>
    ) : null}>
      <View style={styles.pad}>
        {isLoading ? <><Header heading="Site" /><Skeleton h={130} r={20} style={styles.skel} /><Skeleton h={140} r={24} style={styles.skel} /></>
          : error || !st ? <><Header heading="Site" /><ErrorState title="Couldn't load this site" body={errorMessage(error)} action="Try again" onAction={refetch} /></> : null}
      </View>
      {st ? (
        <>
          <View style={styles.pad}>
            <Header heading={st.name || st.code} sub={`Site evaluation, ${[st.locality, st.city].filter(Boolean).join(', ')}`} right={st.updatedAt ? <View style={styles.saved}><Icon name="check" size={18} color={colors.muted} /><AppText variant="small" color="muted">Saved {fmtDate(st.updatedAt.slice(0, 10)).slice(0, 6)}</AppText></View> : null} />
            <View style={styles.chips}>
              <Chip label={stage} tone={STAGE_TONE[stage] || 'grey'} />
              {st.purpose ? <Chip label={st.purpose} tone="grey" /> : null}
              {d.req ? <Chip label={d.req.code} tone="grey" dot={false} /> : null}
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps} style={styles.stepsWrap}>
            <FilterChip label="Photos" done={photos.length >= 3} />
            <FilterChip label="Basics" done={!!(measured && +st.quotedRent)} />
            <FilterChip label="Catchment" done={d.catch.filled} />
            <FilterChip label={`Checklist ${d.score.done}/${d.score.total}`} done={d.score.done === d.score.total} selected={d.score.done < d.score.total} />
          </ScrollView>
          <View style={styles.pad}>
            <View style={styles.media}>
              <PhotoTile label={uploading === 'photos' ? 'Uploading…' : photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} · add` : 'Add site photos'} height={132} uri={photos[0] ? fileUrl(photos[0].id || photos[0], mediaToken) : undefined} state={photos.length ? 'photo' : 'capture'} onPress={() => addPhotos('photos')} />
              <PhotoTile label={uploading === 'front' ? 'Uploading…' : st.frontPhoto ? 'Front view · change' : 'Front view needed'} height={132} uri={st.frontPhoto ? fileUrl(st.frontPhoto.id || st.frontPhoto, mediaToken) : undefined} state={st.frontPhoto ? 'photo' : 'capture'} onPress={() => addPhotos('front')} />
            </View>
            <View style={styles.catch}>
              <Gauge width={120} stroke={10} value={d.catch.idx / 100} color={colors.white} track="rgba(255,255,255,0.3)">
                <AppText variant="monoXl" color="white" style={styles.gaugeNum}>{d.catch.filled ? d.catch.idx : '–'}</AppText>
              </Gauge>
              <View style={styles.catchText}>
                <AppText variant="h3" color="white">Catchment index</AppText>
                <AppText variant="body" color={colors.onTealMuted} style={styles.catchBody}>{d.catch.filled ? Object.entries(d.catch.parts).map(([k, n]) => `${k} ${n}/${CATCH_MAX[k]}`).join(' · ') : 'Counts of hospitals, clinics, homes and competitors are entered on the web.'}</AppText>
                {st.catch?.case ? <AppText variant="small" color={colors.onTealMuted} style={styles.catchCase} numberOfLines={3}>{st.catch.case}</AppText> : null}
              </View>
            </View>
            <View style={styles.measures}>
              <View style={styles.mTile}><AppText variant="small" color="muted">Measured</AppText><View style={styles.mValueRow}><AppText variant="monoLg">{measured || quoted || '–'}</AppText><AppText variant="mono" style={styles.unit}>sq ft</AppText></View><AppText variant="small" weight={diff ? 'semibold' : undefined} color={diff < 0 ? 'coralInk' : 'muted'} style={styles.mSub}>{measured && quoted ? (diff ? `${Math.abs(diff)}% ${diff < 0 ? 'under' : 'over'} quote` : 'As quoted') : 'Not measured'}</AppText></View>
              <View style={styles.mTile}><AppText variant="small" color="muted">Rent asked</AppText><AppText variant="monoLg" numberOfLines={1} adjustsFontSizeToFit>{st.quotedRent ? inr(st.quotedRent) : '–'}</AppText><AppText variant="mono" color="muted" style={styles.mSub}>{rentPsf ? `₹${rentPsf} / sq ft` : ''}</AppText></View>
              <View style={styles.mTile}><AppText variant="small" color="muted">Frontage</AppText><View style={styles.mValueRow}><AppText variant="monoLg">{st.frontage || '–'}</AppText><AppText variant="mono" style={styles.unit}>ft</AppText></View><AppText variant="small" color="muted" style={styles.mSub}>{st.floor || ''}</AppText></View>
            </View>
            <SectionHeader title="Checklist" action={`${d.score.verdict}${d.score.done ? ` · ${d.score.pct}%` : ''}`} actionColor={d.score.crit.length ? 'coralInk' : 'muted'} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.steps} style={styles.secWrap}>
            {sections.map(x => { const n = d.items.filter(i => i.sec === x); const done = n.filter(i => i.v).length; return <FilterChip key={x} label={`${x.split(' ')[0]} ${done}/${n.length}`} selected={sec === x} onPress={() => setSection(x)} />; })}
          </ScrollView>
          <View style={styles.pad}>
            {items.map((it, i) => (
              <Pressable key={it.k} onPress={() => { setItem(it); setV(it.v); setRemark(it.remark); }} accessibilityRole="button" style={[styles.item, i < items.length - 1 && styles.divider]}>
                <View style={styles.flex}>
                  <AppText variant="body" numberOfLines={2}>{it.label}</AppText>
                  {it.remark ? <AppText variant="small" color="muted" numberOfLines={1} style={styles.remark}>{it.remark}</AppText> : null}
                </View>
                <Chip label={it.v || 'To do'} tone={V_TONE[it.v] || 'grey'} size="sm" />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <BottomSheet open={!!item} onClose={() => setItem(null)} title="Check item">
        {item ? (
          <>
            <AppText variant="body">{item.label}{item.crit ? <AppText variant="smallSemi" color="coralInk"> · critical</AppText> : null}</AppText>
            <View style={styles.choices}>{['Pass', 'Concern', 'Fail', 'N/A'].map(x => <ChoiceChip key={x} label={x} tone={V_TONE[x]} selected={v === x} onPress={() => setV(x)} />)}</View>
            <Input label="Remark" value={remark} onChangeText={setRemark} multiline placeholder={v === 'Pass' ? 'Optional' : 'Explain what you saw'} autoCapitalize="sentences" style={styles.remarkField} />
            <View style={styles.sheetBtns}>
              <Button title="Cancel" variant="secondary" full onPress={() => setItem(null)} />
              <Button title="Save" variant="primary" full onPress={saveCheck} disabled={!v || (['Concern', 'Fail'].includes(v) && remark.trim().length < 3)} loading={patchState.isLoading} />
            </View>
          </>
        ) : null}
      </BottomSheet>
      <BottomSheet open={reject} onClose={() => setReject(false)} title="Reject site">
        <AppText variant="body" color="muted">Say why, so the person who found it knows what to look for next time.</AppText>
        <Input value={reason} onChangeText={setReason} multiline placeholder="e.g. Earth resistance is too high and there is no room for new pits" autoCapitalize="sentences" style={styles.remarkField} />
        <View style={styles.sheetBtns}>
          <Button title="Keep it" variant="secondary" full onPress={() => setReject(false)} />
          <Button title="Reject" variant="coralSolid" full onPress={() => setStage('Rejected', `Rejected: ${reason.trim()}`)} disabled={reason.trim().length < 5} loading={patchState.isLoading} />
        </View>
      </BottomSheet>
      <PhotoPickerSheet {...pickerProps} />
      <ConfirmDialog open={!!confirm} icon="check-circle" title={confirm?.title} text={confirm?.text} confirmLabel="Yes" loading={patchState.isLoading} onCancel={() => setConfirm(null)} onConfirm={() => setStage(confirm.stage, `Moved to ${confirm.stage}`)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: gutter },
  skel: { marginTop: vs(14) },
  saved: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginTop: vs(8) },
  stepsWrap: { flexGrow: 0, marginTop: vs(16) },
  secWrap: { flexGrow: 0, marginTop: vs(2), marginBottom: vs(6) },
  steps: { paddingHorizontal: gutter, gap: s(8) },
  media: { flexDirection: 'row', gap: s(12), marginTop: vs(18) },
  catch: { flexDirection: 'row', alignItems: 'center', gap: s(16), backgroundColor: colors.teal, borderRadius: ms(24), padding: s(18), marginTop: vs(16) },
  gaugeNum: { marginTop: vs(8) },
  catchText: { flex: 1 },
  catchBody: { marginTop: vs(4), fontSize: ms(13.5) },
  catchCase: { marginTop: vs(6) },
  measures: { flexDirection: 'row', gap: s(10), marginTop: vs(14) },
  mTile: { flex: 1, backgroundColor: colors.sunk, borderRadius: ms(18), padding: s(12), paddingVertical: vs(14) },
  mValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: s(6), marginTop: vs(2) },
  unit: { fontSize: ms(12) },
  mSub: { marginTop: vs(4), fontSize: ms(12.5) },
  item: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingVertical: vs(12) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  remark: { marginTop: vs(2) },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: s(10), marginTop: vs(14) },
  remarkField: { marginTop: vs(14) },
  sheetBtns: { flexDirection: 'row', gap: s(12), marginTop: vs(16) },
  flex: { flex: 1 },
});
