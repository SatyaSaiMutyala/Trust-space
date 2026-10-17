/* Checklist choice: outlined pill with a coloured dot (Good, Minor issue, Damaged, Missing, Not applicable).
   Selected → tinted background and border in the dot's colour. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, tones, ms, s, vs } from '../theme';
import AppText from './AppText';

export const CHOICE_TONES = { Good: 'teal', 'Minor issue': 'amber', Damaged: 'coral', Missing: 'coral', 'Not applicable': 'grey' };

export default function ChoiceChip({ label, tone, selected, onPress, style }) {
  const t = tones[tone || CHOICE_TONES[label] || 'grey'];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && { backgroundColor: t.bg, borderColor: t.dot }, pressed && styles.pressed, style]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <AppText variant="title" color={selected ? t.fg : colors.ink}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: s(8), paddingHorizontal: s(16), height: vs(42), borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  dot: { width: ms(10), height: ms(10), borderRadius: ms(5) },
  pressed: { opacity: 0.85 },
});
