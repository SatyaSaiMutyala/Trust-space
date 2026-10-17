/* Sticky bottom action bar: optional hint line above the buttons (muted or amber), buttons side by side or stacked. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';

export default function Footer({ children, hint, hintColor = 'muted', hintWeight, stacked, bg = colors.white, style, flat }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, vs(12)) }, !flat && shadows.sheet, style]}>
      {hint ? <AppText variant="small" weight={hintWeight} color={hintColor} center style={styles.hint}>{hint}</AppText> : null}
      <View style={[styles.row, stacked && styles.stacked]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: gutter, paddingTop: vs(10), borderTopWidth: 1, borderTopColor: colors.lineSoft },
  hint: { marginBottom: vs(10), fontSize: ms(13.5) },
  row: { flexDirection: 'row', gap: s(12), alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
});
