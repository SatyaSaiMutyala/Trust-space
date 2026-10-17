/* Area photos (design p.12): step bars Checklist / Photos / Videos / Sign-off, instruction, grid of photo arches in
   every state, hint line, Next: videos. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ms, s, vs } from '../../theme';
import { Screen, AppText, Header, ProgressSegments, PhotoArch, Footer, Button } from '../../components';
import { areas } from '../../mock/data';

export function StepBars({ steps }) {
  const cur = steps.findIndex(st => st.value > 0 && st.value < 1);
  return (
    <View>
      <ProgressSegments items={steps.map(st => ({ value: st.value }))} height={7} />
      <View style={styles.stepLabels}>
        {steps.map((st, i) => <AppText key={st.label} variant="title" color={st.value >= 1 ? 'teal' : i === cur || (cur < 0 && st.value > 0) ? 'ink' : 'muted'} style={styles.stepLabel}>{st.label}</AppText>)}
      </View>
    </View>
  );
}

export default function AreaPhotosScreen() {
  const nav = useNavigation();
  const pairs = [];
  for (let i = 0; i < areas.tiles.length; i += 2) pairs.push(areas.tiles.slice(i, i + 2));
  return (
    <Screen footer={(
      <Footer hint={areas.hint} hintColor="amberInk" hintWeight="semibold">
        <Button title="Next: videos" variant="primary" full onPress={() => nav.navigate('VideoRecording')} />
      </Footer>
    )}>
      <Header title={areas.title} />
      <AppText variant="display" style={styles.title}>Area photos</AppText>
      <StepBars steps={areas.steps} />
      <AppText variant="body" color="muted" style={styles.intro}>Take one wide photo of each area. <AppText variant="bodySemi">3 of 4 done.</AppText> They save on this phone first, so no signal is fine.</AppText>
      {pairs.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map(t => <PhotoArch key={t.label} {...t} onPress={() => {}} style={styles.arch} />)}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: vs(4), marginBottom: vs(16) },
  stepLabels: { flexDirection: 'row', marginTop: vs(10) },
  stepLabel: { flex: 1, fontSize: ms(14.5) },
  intro: { marginTop: vs(20), fontSize: ms(15) },
  row: { flexDirection: 'row', gap: s(14), marginTop: vs(14) },
  arch: { flex: 1 },
});
