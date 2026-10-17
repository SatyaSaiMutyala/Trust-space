/* Horizontal stepper. steps: [{ label, state: 'done' | 'current' | 'todo' }]. ring: amber (approvals) | teal (tickets). */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function Stepper({ steps, ring = 'teal', size = 26, style }) {
  const sz = ms(size);
  const ringColor = ring === 'amber' ? colors.amber : colors.teal;
  return (
    <View style={[styles.row, style]}>
      {steps.map((st, i) => {
        const done = st.state === 'done', cur = st.state === 'current';
        const leftDone = i > 0 && (steps[i - 1].state === 'done');
        return (
          <View key={i} style={styles.step}>
            <View style={[styles.lineRow, { height: sz }]}>
              <View style={[styles.line, i === 0 && styles.hidden, { backgroundColor: leftDone ? colors.teal : colors.lineSoft }]} />
              <View style={[styles.circle, { width: sz, height: sz, borderRadius: sz / 2 }, done && styles.done, cur && { borderColor: ringColor, borderWidth: 2.5 }]}>
                {done ? <Icon name="check" size={size * 0.6} color={colors.white} strokeWidth={2.6} /> : cur ? <View style={[styles.dot, { backgroundColor: ringColor }]} /> : null}
              </View>
              <View style={[styles.line, i === steps.length - 1 && styles.hidden, { backgroundColor: done ? colors.teal : colors.lineSoft }]} />
            </View>
            <AppText variant={cur ? 'smallSemi' : 'small'} color={cur ? colors.ink : colors.muted} center numberOfLines={1} style={styles.label}>{st.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center' },
  lineRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2 },
  hidden: { opacity: 0 },
  circle: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.teal, borderColor: colors.teal },
  dot: { width: ms(9), height: ms(9), borderRadius: ms(5) },
  label: { marginTop: vs(8), fontSize: ms(12) },
});
