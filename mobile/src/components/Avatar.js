/* Initials avatar. tone: teal (solid) | mist (light) | dark. <AvatarGroup people=[{initials,tone}] /> overlaps them. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, ms } from '../theme';
import AppText from './AppText';

const BG = { teal: colors.teal, mist: colors.tealTint, dark: colors.deepTeal, amber: colors.amberTint, coral: colors.coralTint, white: colors.white };
const FG = { teal: colors.white, mist: colors.tealInk, dark: colors.white, amber: colors.amberInk, coral: colors.coralInk, white: colors.teal };

export default function Avatar({ initials, size = 44, tone = 'teal', style }) {
  const sz = ms(size);
  return (
    <View style={[styles.av, { width: sz, height: sz, borderRadius: sz / 2, backgroundColor: BG[tone] }, style]}>
      <AppText variant="title" weight="semibold" color={FG[tone]} style={{ fontSize: sz * 0.36, lineHeight: sz * 0.5 }}>{initials}</AppText>
    </View>
  );
}

export function AvatarGroup({ people, size = 40 }) {
  const sz = ms(size);
  return (
    <View style={[styles.group, { height: sz, width: sz + (people.length - 1) * sz * 0.72 }]}>
      {people.map((p, i) => <Avatar key={i} initials={p.initials} tone={p.tone || (i ? 'mist' : 'teal')} size={size} style={[styles.stacked, { left: i * sz * 0.72, zIndex: i }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  av: { alignItems: 'center', justifyContent: 'center' },
  group: { flexDirection: 'row' },
  stacked: { position: 'absolute', borderWidth: 2, borderColor: colors.white },
});
