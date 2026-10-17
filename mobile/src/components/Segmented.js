/* Segmented control. options: [{ label, value, icon }]. tone: light (mist track, white selected pill, teal text)
   | dark (translucent dark track on photos, white selected pill). shape: rounded | pill. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs, shadows } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export default function Segmented({ options, value, onChange, tone = 'light', shape = 'rounded', style, compact }) {
  const dark = tone === 'dark';
  return (
    <View style={[styles.track, dark && styles.trackDark, shape === 'pill' && styles.pill, compact && styles.compact, style]}>
      {options.map(o => {
        const on = o.value === value;
        const fg = on ? colors.teal : dark ? colors.white : colors.ink;
        return (
          <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange && onChange(o.value)}
            style={[styles.item, compact && styles.itemCompact, shape === 'pill' && styles.pill, on && styles.on, on && shadows.button]}>
            {o.icon ? <Icon name={o.icon} size={20} color={fg} /> : null}
            <AppText variant="title" color={on && dark ? colors.ink : fg} center numberOfLines={2} style={compact && styles.compactText}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.tealTint, borderRadius: ms(16), padding: ms(4) },
  trackDark: { backgroundColor: 'rgba(16,32,30,0.6)' },
  pill: { borderRadius: 999 },
  compact: { padding: ms(3) },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8), minHeight: vs(42), paddingHorizontal: s(8), paddingVertical: vs(4), borderRadius: ms(13) },
  itemCompact: { minHeight: vs(34), borderRadius: ms(11) },
  compactText: { fontSize: ms(13.5) },
  on: { backgroundColor: colors.white },
});
