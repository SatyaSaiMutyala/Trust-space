/* Area photos (design p.12): step bars, instruction, a grid of photo arches — taken (with "Waiting" while still on
   the phone), needed (up to the minimum of 4), add more — then Next: videos. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ms, s, vs } from '../../theme';
import { Screen, AppText, Header, StepBars, PhotoArch, Footer, Button, Skeleton, ErrorState, PhotoPickerSheet, usePhotoPicker } from '../../components';
import { useAppSelector } from '../../store/hooks';
import { useInspection } from '../../store/useInspection';
import { photoUri, kindLabel } from './inspectionUi';

const MIN = 4;
const SUGGEST = ['Reception', 'Main room', 'Washroom', 'Frontage', 'Terrace', 'Store'];

export default function AreaPhotosScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const { mediaToken } = useAppSelector(st => st.auth);
  const { view, inspection: I, isLoading, error, refetch, addPhotos } = useInspection(id);
  const [pick, pickerProps] = usePhotoPicker();
  const [err, setErr] = useState('');
  const photos = I?.roomPhotos || [];
  const canEdit = !!view?.canEdit;
  const take = async () => {
    const files = await pick({ multiple: true, title: 'Area photos' });
    if (files.error) { setErr(files.error); return; }
    setErr(''); addPhotos('__room', files);
  };
  const tiles = photos.map((p, i) => ({ key: 'p' + i, state: p.local ? 'waiting' : 'photo', label: p.local ? 'Waiting' : SUGGEST[i] || `Photo ${i + 1}`, uri: photoUri(p, mediaToken), labelPosition: p.local ? 'chip' : 'left' }));
  if (canEdit) {
    for (let i = photos.length; i < MIN; i++) tiles.push({ key: 'n' + i, state: 'needed', label: SUGGEST[i] || 'Add photo', sub: 'Required' });
    tiles.push({ key: 'add', state: 'add', label: 'Add more', sub: 'Optional' });
  }
  const pairs = [];
  for (let i = 0; i < tiles.length; i += 2) pairs.push(tiles.slice(i, i + 2));
  const left = Math.max(0, MIN - photos.length);
  return (
    <Screen footer={I ? (
      <Footer hint={err || (left ? `${left} more photo${left === 1 ? '' : 's'} needed before sign-off` : 'All area photos done')} hintColor={err ? 'coralInk' : left ? 'amberInk' : 'tealInk'} hintWeight="semibold">
        <Button title="Next: videos" variant="primary" full onPress={() => nav.navigate('VideoRecording', { id })} />
      </Footer>
    ) : null}>
      <Header heading="Area photos" sub={view ? `${view.property?.name || ''} ${kindLabel(I.kind)}` : ''} />
      {isLoading ? <Skeleton h={200} r={24} style={styles.intro} /> : error || !view ? <ErrorState title="Couldn't open this inspection" body={error || 'Not found'} action="Try again" onAction={refetch} /> : (
        <>
          <StepBars steps={view.steps} />
          <AppText variant="body" color="muted" style={styles.intro}>Take one wide photo of each area: every room, washroom, terrace and the frontage. <AppText variant="bodySemi">{Math.min(photos.length, MIN)} of {MIN} done.</AppText> They save on this phone first, so no signal is fine.</AppText>
          {pairs.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map(t => <PhotoArch key={t.key} state={t.state} label={t.label} sub={t.sub} uri={t.uri} labelPosition={t.labelPosition} onPress={canEdit ? take : undefined} style={styles.arch} />)}
              {row.length === 1 ? <View style={styles.arch} /> : null}
            </View>
          ))}
        </>
      )}
      <PhotoPickerSheet {...pickerProps} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: vs(20), fontSize: ms(15) },
  row: { flexDirection: 'row', gap: s(14), marginTop: vs(14) },
  arch: { flex: 1 },
});
