/* Progress pieces.
   <ProgressSegments items=[{ value: 0..1, tone }] /> — row of thin bars (steps, locations, inspection items).
   <StackedBar parts=[{ value, color }] /> — one bar split into coloured parts (48 items checked).
   <ProgressBar value=0.62 /> — single bar. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, tones, s, vs } from '../theme';

const toneColor = t => (t === 'blue' ? '#8FB4E8' : t && tones[t] ? tones[t].dot : colors.teal);

export function ProgressSegments({ items, height = 6, gap = 8, track = colors.lineSoft, style }) {
  return (
    <View style={[styles.row, { gap: s(gap) }, style]}>
      {items.map((it, i) => (
        <View key={i} style={[styles.seg, { height: vs(height), borderRadius: vs(height) / 2, backgroundColor: track }]}>
          <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, it.value)) * 100}%`, backgroundColor: toneColor(it.tone), borderRadius: vs(height) / 2 }]} />
        </View>
      ))}
    </View>
  );
}

export function StackedBar({ parts, height = 12, track = colors.white, style }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <View style={[styles.stacked, { height: vs(height), borderRadius: vs(height) / 2, backgroundColor: track }, style]}>
      {parts.map((p, i) => <View key={i} style={{ flex: p.value / total, backgroundColor: p.color, marginRight: i < parts.length - 1 ? 2 : 0 }} />)}
    </View>
  );
}

export function ProgressBar({ value = 0, height = 8, color = colors.teal, track = colors.lineSoft, style }) {
  return (
    <View style={[styles.seg, { height: vs(height), borderRadius: vs(height) / 2, backgroundColor: track }, style]}>
      <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, value)) * 100}%`, backgroundColor: color, borderRadius: vs(height) / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  seg: { flex: 1, overflow: 'hidden' },
  fill: { height: '100%' },
  stacked: { flexDirection: 'row', overflow: 'hidden' },
});
