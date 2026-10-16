/* Buttons: primary (green), secondary (outlined), ghost and danger. Always at least 44 pt tall. */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, hitSize, ms, radius, spacing } from '../theme';
import AppText from './AppText';

export default function Button({ title, onPress, variant = 'secondary', loading, disabled, small, style }) {
  const off = disabled || loading;
  const fg = variant === 'primary' ? colors.accentInk : variant === 'danger' ? colors.bad : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.base, small && styles.small, styles[variant], pressed && styles.pressed, off && styles.off, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <AppText variant={small ? 'small' : 'body'} style={[styles.label, { color: fg }]}>{title}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: hitSize, paddingHorizontal: spacing.lg, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  small: { minHeight: ms(36), paddingHorizontal: spacing.md },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.surface, borderColor: colors.bad },
  pressed: { opacity: 0.85 },
  off: { opacity: 0.5 },
  label: { fontWeight: '600' },
});
