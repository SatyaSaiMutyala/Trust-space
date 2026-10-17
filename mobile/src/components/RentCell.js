/* Rent-roll month cell. kind: paid | process | overdue | notInvoiced | upcoming | rentFree | deposit | coowners (label "1/2").
   selected draws the ink ring. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

const KINDS = {
  paid: { bg: colors.teal, icon: 'check', fg: colors.white },
  process: { bg: colors.blueTint, text: '…', fg: colors.blue, border: '#C3D2EC' },
  overdue: { bg: colors.coral, text: '!', fg: colors.white },
  notInvoiced: { bg: colors.white, text: '–', fg: colors.muted, border: colors.line },
  upcoming: { bg: colors.sunk, fg: colors.muted },
  rentFree: { bg: colors.amberTint, text: 'RF', fg: colors.amberInk },
  deposit: { bg: colors.tealTint, text: 'D', fg: colors.teal, border: colors.teal },
  coowners: { bg: colors.white, fg: colors.blue, border: colors.blue },
};

export default function RentCell({ kind = 'upcoming', label, size = 40, selected, onPress, style }) {
  const k = KINDS[kind] || KINDS.upcoming;
  const sz = ms(size);
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label || kind}
      style={[styles.cell, { width: sz, height: sz, borderRadius: sz * 0.3, backgroundColor: k.bg }, k.border && { borderWidth: 1.5, borderColor: k.border }, selected && styles.selected, style]}>
      {k.icon ? <Icon name={k.icon} size={size * 0.5} color={k.fg} strokeWidth={2.6} /> : (label || k.text) ? <AppText variant="monoSmall" weight="semibold" color={k.fg} style={{ fontSize: sz * (kind === 'coowners' ? 0.28 : 0.34) }}>{label || k.text}</AppText> : null}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 3, borderColor: colors.ink },
});
