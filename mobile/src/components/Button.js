/* Buttons. variant: primary (teal) | secondary (white, outlined) | danger (coral outline) | tonal (mist, teal text)
   | ghost (text only) | dark (ink). size: lg (52) | md (44) | sm (36). `icon` puts a line icon before the label. */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs, radius, typography } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

const FG = { primary: colors.white, secondary: colors.ink, danger: colors.coral, tonal: colors.teal, ghost: colors.teal, dark: colors.white, white: colors.teal, coralSolid: colors.white };

export default function Button({ title, onPress, variant = 'secondary', size = 'lg', icon, iconRight, loading, disabled, full, style, textStyle, color }) {
  const off = disabled || loading;
  const fg = color || FG[variant] || colors.ink;
  const iconSize = size === 'sm' ? 16 : 20;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.base, styles[size], styles[variant], full && styles.full, pressed && styles.pressed, off && styles.off, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          <AppText variant={size === 'sm' ? 'buttonSmall' : 'button'} color={fg} style={[size === 'md' && styles.mdText, textStyle]} numberOfLines={1}>{title}</AppText>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', paddingHorizontal: s(18) },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  lg: { height: vs(48), borderRadius: ms(16) },
  md: { height: vs(42), borderRadius: ms(13), paddingHorizontal: s(16) },
  sm: { height: vs(34), borderRadius: ms(11), paddingHorizontal: s(14) },
  mdText: { fontSize: typography.buttonSmall.fontSize + 1 },
  full: { alignSelf: 'stretch', flex: 1 },
  primary: { backgroundColor: colors.teal, borderColor: colors.teal },
  secondary: { backgroundColor: colors.surface, borderColor: colors.line },
  danger: { backgroundColor: colors.surface, borderColor: '#EFC3AE' },
  tonal: { backgroundColor: colors.tealTint, borderColor: colors.tealTint },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
  white: { backgroundColor: colors.white, borderColor: colors.white },
  coralSolid: { backgroundColor: colors.coral, borderColor: colors.coral },
  pressed: { opacity: 0.82 },
  off: { opacity: 0.5 },
});
