/* Status chip: a tinted pill with a dot and a short label. tone: teal | blue | amber | coral | grey | ink,
   or leave it out to derive the tone from the label (Paid → teal, Overdue → coral …). */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tones, toneOf, ms, s, vs } from '../theme';
import AppText from './AppText';

export default function Chip({ label, tone, dot = true, size = 'md', style, textColor, bg }) {
  const t = tones[tone || toneOf(label)] || tones.grey;
  const sm = size === 'sm';
  return (
    <View style={[styles.chip, sm && styles.sm, { backgroundColor: bg || t.bg }, style]}>
      {dot ? <View style={[styles.dot, sm && styles.dotSm, { backgroundColor: t.dot }]} /> : null}
      <AppText variant={sm ? 'captionSemi' : 'smallSemi'} color={textColor || t.fg} numberOfLines={1}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: s(6), paddingHorizontal: s(10), height: vs(26), borderRadius: 999 },
  sm: { paddingHorizontal: s(8), height: vs(21), gap: s(5) },
  dot: { width: ms(7), height: ms(7), borderRadius: ms(4) },
  dotSm: { width: ms(6), height: ms(6), borderRadius: ms(3) },
});
