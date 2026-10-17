/* <CountBadge n tone /> — big tinted circle with a number (Needs you today).
   <Badge n /> — small coral counter for tab icons. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, tones, ms } from '../theme';
import AppText from './AppText';

export function CountBadge({ n, tone = 'amber', size = 40 }) {
  const t = tones[tone] || tones.grey;
  const sz = ms(size);
  return (
    <View style={[styles.count, { width: sz, height: sz, borderRadius: sz / 2, backgroundColor: t.bg }]}>
      <AppText variant="h3" color={t.fg} style={{ fontSize: sz * 0.44, lineHeight: sz * 0.6 }}>{n}</AppText>
    </View>
  );
}

export function Badge({ n, style }) {
  if (!n) return null;
  return (
    <View style={[styles.badge, style]}>
      <AppText variant="captionSemi" color="white" style={styles.badgeText}>{n}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: ms(20), height: ms(20), borderRadius: ms(10), paddingHorizontal: ms(5), backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { fontSize: ms(10.5), lineHeight: ms(13) },
});
