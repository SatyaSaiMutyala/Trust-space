/* Label on the left, value on the right (mono for money). bold for totals; valueColor for coral deductions. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, vs } from '../theme';
import AppText from './AppText';

export default function KeyValueRow({ label, value, mono = true, bold, valueColor, labelColor, divider = true, style, size = 'md' }) {
  const lg = size === 'lg';
  return (
    <View style={[styles.row, divider && styles.divider, lg && styles.lg, style]}>
      <AppText variant={bold ? (lg ? 'h4' : 'bodySemi') : 'body'} weight={bold && !lg ? 'semibold' : undefined} color={labelColor || (bold ? 'ink' : 'muted')} style={styles.label}>{label}</AppText>
      {typeof value === 'string' || typeof value === 'number'
        ? <AppText variant={mono ? (lg ? 'monoLg' : 'monoMd') : 'body'} weight={bold ? 'semibold' : undefined} color={valueColor || 'ink'} right>{value}</AppText>
        : value}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(11), gap: 12 },
  lg: { paddingVertical: vs(14) },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  label: { flexShrink: 1 },
});
