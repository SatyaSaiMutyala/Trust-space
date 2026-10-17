/* Inspect tab: inspections to do / in progress / done. */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ms, vs } from '../../theme';
import { Screen, AppText, ListRow, Chip, Button } from '../../components';
import { inspectionsList } from '../../mock/data';

export default function InspectScreen() {
  const nav = useNavigation();
  return (
    <Screen tabs>
      <AppText variant="body" color="muted" style={styles.eyebrow}>2 to finish this week</AppText>
      <AppText variant="display">Inspections</AppText>
      <Button title="Start an inspection" variant="primary" icon="plus" onPress={() => nav.navigate('AreaPhotos')} style={styles.start} />
      {inspectionsList.map((it, i) => (
        <ListRow key={it.title} title={it.title} sub={it.sub} right={<Chip label={it.chip} tone={it.tone} size="sm" />} chevron onPress={() => nav.navigate(it.to, it.params)} divider={i < inspectionsList.length - 1} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ eyebrow: { marginTop: vs(14), fontSize: ms(15) }, start: { marginVertical: vs(18) } });
