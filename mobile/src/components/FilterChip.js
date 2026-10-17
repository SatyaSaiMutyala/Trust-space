/* Selectable pill (filters, invoice types, step chips).
   selected → solid teal; done → mist with a check; otherwise white with a line border. */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function FilterChip({ label, selected, done, onPress, icon, style, size = 'md' }) {
  const fg = selected ? colors.white : done ? colors.teal : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={({ pressed }) => [styles.chip, size === 'lg' && styles.lg, selected && styles.selected, done && styles.done, pressed && styles.pressed, style]}>
      {done ? <Icon name="check" size={16} color={colors.teal} strokeWidth={2.2} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant={size === 'lg' ? 'title' : 'smallSemi'} color={fg} style={size === 'md' && styles.mdText}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: s(7), paddingHorizontal: s(14), height: vs(36), borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface },
  lg: { height: vs(42), paddingHorizontal: s(16) },
  mdText: { fontSize: ms(13.5) },
  selected: { backgroundColor: colors.teal, borderColor: colors.teal },
  done: { backgroundColor: colors.tealTint, borderColor: colors.tealTint },
  pressed: { opacity: 0.85 },
});
