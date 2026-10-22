/* Round icon-only buttons. variant: plain (no background) | light (white circle with shadow) | sunk (grey circle)
   | dark (translucent on photos) | teal (solid) | mist. */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, ms, shadows } from '../theme';
import Icon from './Icon';

const FG = { plain: colors.ink, light: colors.ink, sunk: colors.ink, dark: colors.white, teal: colors.white, mist: colors.teal, coral: colors.white };

export default function IconButton({ name, onPress, variant = 'plain', size = 40, iconSize = 20, color, style, accessibilityLabel, disabled = false }) {
  const fg = color || FG[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || name} onPress={onPress} disabled={disabled} accessibilityState={{ disabled }} hitSlop={8}
      style={({ pressed }) => [styles.base, { width: ms(size), height: ms(size), borderRadius: ms(size) / 2 }, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <Icon name={name} size={iconSize} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  plain: {},
  light: { backgroundColor: colors.white, ...shadows.card },
  sunk: { backgroundColor: colors.sunk },
  dark: { backgroundColor: 'rgba(16,32,30,0.55)' },
  teal: { backgroundColor: colors.teal },
  mist: { backgroundColor: colors.tealTint },
  coral: { backgroundColor: colors.coral },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
