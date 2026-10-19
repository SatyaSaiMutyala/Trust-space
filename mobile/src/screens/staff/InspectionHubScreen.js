/* One inspection: the four steps, the people present, every checklist section with its progress, then area photos,
   videos and sign-off. Works from the copy on this phone when there is no connection; edits queue and upload later. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, ms, s, vs } from '../../theme';
import { Screen, AppText, Header, StepBars, Banner, Input, ListRow, Chip, Footer, Button, Skeleton, ErrorState, SectionHeader, BottomSheet } from '../../components';
import { useInspection } from '../../store/useInspection';
import { errorMessage, todayISO } from '../../store/api';
import { STATUS_TONE, STATUS_LABEL, firstTodo } from './inspectionUi';

export default function InspectionHubScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { view, inspection: I, isLoading, error, refetch, pending, offline, saveField, addFixture } = useInspection(id);
  const [fields, setFields] = useState(null); // typed header values (uncontrolled until first edit)
  const [fix, setFix] = useState(null); // { label, qty } while adding a fixture
  const [fixErr, setFixErr] = useState('');
  const f = key => (fields && fields[key] !== undefined ? fields[key] : I ? I[key] || '' : '');
  const set = key => v => { setFields(x => ({ ...(x || {}), [key]: v })); saveField(key, v); };
  const canEdit = !!view?.canEdit;
  const todo = firstTodo(view);
  const next = () => (todo ? nav.navigate('InspectionItem', { id, k: todo.k }) : (I.roomPhotos || []).length < 4 ? nav.navigate('AreaPhotos', { id }) : !I.tdplVideo ? nav.navigate('VideoRecording', { id }) : nav.navigate('SignOff', { id }));
  const addFix = async () => {
    if (!fix?.label?.trim()) { setFixErr('Name the fixture, e.g. Ceiling fans.'); return; }
    try { await addFixture(fix.label.trim(), +fix.qty || 1); setFix(null); setFixErr(''); } catch (e) { setFixErr(errorMessage(e)); }
  };
  return (
    <Screen padded={false} edges={offline || pending ? ['left', 'right'] : undefined} footer={I && canEdit ? (
      <Footer hint={view.problems.length ? `${view.problems.length} item${view.problems.length === 1 ? '' : 's'} left before sign-off` : 'Everything is recorded — sign off together.'} hintColor={view.problems.length ? 'muted' : 'tealInk'}>
        <Button title={todo ? 'Continue checklist' : view.problems.length ? 'Continue' : 'Go to sign-off'} variant="primary" full onPress={next} />
      </Footer>
    ) : null}>
      {offline || pending ? <Banner lead={offline ? "You're offline." : 'Uploading.'} text={pending ? `${pending} change${pending === 1 ? '' : 's'} saved on this phone${offline ? ' and will upload when you are back online' : ''}.` : 'Changes you make are saved on this phone first.'} style={styles.banner} /> : null}
      <View style={styles.pad}>
        {isLoading ? <><Header heading="Inspection" /><Skeleton h={60} r={16} style={styles.skel} /><Skeleton h={200} r={20} style={styles.skel} /></>
          : error || !view ? <><Header heading="Inspection" /><ErrorState title="Couldn't open this inspection" body={error || 'Not found'} action="Try again" onAction={refetch} /></> : (
            <>
              <Header heading={view.property?.name || 'Inspection'} sub={view.title} right={<Chip label={STATUS_LABEL[I.status] || I.status} tone={STATUS_TONE[I.status] || 'grey'} size="sm" />} />
              <StepBars steps={view.steps} style={styles.steps} />
              {I.status === 'Disputed' ? <View style={styles.dispute}><AppText variant="smallSemi" color="coralInk">Owner disputed: </AppText><AppText variant="small" color="coralInk">{I.dispute}</AppText></View> : null}
              <SectionHeader title="Who was there" />
              <Input label="Inspection date" value={f('date')} onChangeText={set('date')} placeholder={todayISO()} keyboardType="numbers-and-punctuation" editable={canEdit} hint="YYYY-MM-DD" />
              <Input label="Inspector (name and role)" value={f('inspector')} onChangeText={set('inspector')} placeholder="e.g. R. Kumar, Facilities Executive" autoCapitalize="words" editable={canEdit} style={styles.field} />
              <Input label="Owner or representative" value={f('ownerRep')} onChangeText={set('ownerRep')} placeholder={view.ownerName || 'Owner'} autoCapitalize="words" editable={canEdit} style={styles.field} />
              <Input label="Others present (optional)" value={f('present')} onChangeText={set('present')} placeholder="Electrician, broker…" autoCapitalize="sentences" editable={canEdit} style={styles.field} />
              <SectionHeader title="Checklist" right={<AppText variant="small" color="muted">{view.progress.done} of {view.progress.total}</AppText>} />
              {view.sections.map((sec, i) => (
                <ListRow key={sec.s} title={sec.s} sub={sec.total ? `${sec.done} of ${sec.total} recorded` : 'List every owner-provided item: fans, lights, ACs, furniture…'}
                  right={sec.total ? <Chip label={sec.done === sec.total ? 'Done' : sec.done ? 'Partly' : 'To do'} tone={sec.done === sec.total ? 'teal' : sec.done ? 'blue' : 'grey'} size="sm" /> : null}
                  chevron onPress={() => nav.navigate('InspectionArea', { id, sec: sec.s })} divider={i < view.sections.length - 1} />
              ))}
              {canEdit ? <Button title="Add a fixture" variant="ghost" size="sm" icon="plus" onPress={() => setFix({ label: '', qty: '1' })} style={styles.addFix} /> : null}
              <SectionHeader title="Photos, videos & sign-off" />
              <ListRow title="Area photos" sub={`${(I.roomPhotos || []).length} of minimum 4`} right={<Chip label={(I.roomPhotos || []).length >= 4 ? 'Done' : 'To do'} tone={(I.roomPhotos || []).length >= 4 ? 'teal' : 'grey'} size="sm" />} chevron onPress={() => nav.navigate('AreaPhotos', { id })} />
              <ListRow title="Confirmation videos" sub={`Facilities ${I.tdplVideo ? 'recorded' : 'to record'} · owner ${I.ownerVideo ? 'recorded' : 'at sign-off'}`} right={<Chip label={I.tdplVideo && I.ownerVideo ? 'Done' : I.tdplVideo ? 'Partly' : 'To do'} tone={I.tdplVideo && I.ownerVideo ? 'teal' : I.tdplVideo ? 'blue' : 'grey'} size="sm" />} chevron onPress={() => nav.navigate('VideoRecording', { id })} />
              <ListRow title="Sign off together" sub={I.status === 'Signed' ? 'Signed by both parties' : I.tdplSign ? 'Sent to the owner' : view.problems.length ? `${view.problems.length} item${view.problems.length === 1 ? '' : 's'} to complete first` : 'Ready'} right={<Chip label={STATUS_LABEL[I.status]} tone={STATUS_TONE[I.status]} size="sm" />} chevron onPress={() => nav.navigate('SignOff', { id })} divider={false} />
            </>
          )}
      </View>
      <BottomSheet open={!!fix} onClose={() => setFix(null)} title="Add a fixture">
        <Input label="Fixture" value={fix?.label || ''} onChangeText={v => setFix(x => ({ ...x, label: v }))} placeholder="e.g. Ceiling fans" autoCapitalize="sentences" error={fixErr} />
        <Input label="Quantity" value={String(fix?.qty ?? '')} onChangeText={v => setFix(x => ({ ...x, qty: v }))} keyboardType="number-pad" style={styles.field} />
        <AppText variant="caption" color="muted" style={styles.field}>Adding a fixture needs a connection; its condition and photos can be recorded offline afterwards.</AppText>
        <Button title="Add fixture" variant="primary" full onPress={addFix} style={styles.field} />
        <View style={styles.space} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { paddingTop: vs(54) },
  pad: { paddingHorizontal: s(20) },
  steps: { marginTop: vs(6) },
  skel: { marginTop: vs(14) },
  dispute: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.coralTint, borderRadius: ms(14), padding: s(12), marginTop: vs(14) },
  field: { marginTop: vs(12) },
  addFix: { alignSelf: 'flex-start', marginTop: vs(6) },
  space: { height: vs(8) },
});
