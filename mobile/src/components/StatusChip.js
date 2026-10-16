/* Status pill with a dot (Paid, Overdue, In progress…), coloured by kind: ok, warn, bad, info, idle. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms, radius, spacing } from '../theme';
import AppText from './AppText';

export default function StatusChip({ label, kind = 'idle' }) {
  const c = colors[kind];
  return (
    <View style={[styles.chip, tint(c, kind)]}>
      <View style={[styles.dot, { backgroundColor: c }]} />
      <AppText variant="small" style={[styles.text, { color: c }]} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

/** Border in the status colour, background a 10% tint of it (none for idle). */
const tint = (c, kind) => ({ borderColor: c, backgroundColor: kind === 'idle' ? 'transparent' : c + '1A' });

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: ms(2) },
  dot: { width: ms(6), height: ms(6), borderRadius: ms(3) },
  text: { fontWeight: '500' },
});
