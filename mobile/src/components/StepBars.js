/* The four inspection steps as segment bars with labels: Checklist / Photos / Videos / Sign-off.
   steps: [{ label, value 0–1 }]. Done steps are teal, the current one ink, the rest muted. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ms, vs } from '../theme';
import AppText from './AppText';
import { ProgressSegments } from './Progress';

export default function StepBars({ steps, style }) {
  const cur = steps.findIndex(st => st.value < 1);
  return (
    <View style={style}>
      <ProgressSegments items={steps.map(st => ({ value: st.value }))} height={7} />
      <View style={styles.labels}>
        {steps.map((st, i) => <AppText key={st.label} variant="title" color={st.value >= 1 ? 'teal' : i === cur ? 'ink' : 'muted'} style={styles.label}>{st.label}</AppText>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ labels: { flexDirection: 'row', marginTop: vs(10) }, label: { flex: 1, fontSize: ms(14.5) } });
