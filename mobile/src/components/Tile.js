/* Stat tile. tone: amber | coral | mist | blue | grey | white (outlined). label on top, mono value, optional sub line
   (subTone colours it: coral for "₹6,48,400 overdue", amber for "3 past SLA"). `icon` renders the owner "to-do" style
   (white icon box, bold title, tinted sub). `onPress` makes it tappable. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, tones, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

const BG = { amber: colors.amberTint, coral: colors.coralTint, mist: colors.tealTint, blue: colors.blueTint, grey: colors.sunk, white: colors.surface };
const LABEL = { amber: colors.amberInk, coral: colors.coralInk, mist: colors.muted, blue: colors.blueInk, grey: colors.muted, white: colors.muted };

export default function Tile({ tone = 'grey', label, value, valueColor, valueVariant = 'monoLg', sub, subTone, subWeight = 'semibold', icon, title, onPress, style, children, compact }) {
  const subColor = subTone && tones[subTone] ? tones[subTone].fg : colors.muted;
  const Wrap = onPress ? Pressable : View;
  const tileStyle = [styles.tile, compact && styles.compact, { backgroundColor: BG[tone] || tone }, tone === 'white' && styles.outlined, style];
  return (
    <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={onPress ? ({ pressed }) => [...tileStyle, pressed && styles.pressed] : tileStyle}>
      {icon ? (
        <View style={styles.iconBox}><Icon name={icon} size={22} color={LABEL[tone] || colors.teal} /></View>
      ) : null}
      {label ? <AppText variant="body" color={LABEL[tone] || colors.muted}>{label}</AppText> : null}
      {title ? <AppText variant="h3" style={styles.title} color="ink">{title}</AppText> : null}
      {value != null ? <AppText variant={valueVariant} color={valueColor || colors.ink} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText> : null}
      {children}
      {sub ? <AppText variant="small" weight={subWeight} color={subColor} style={styles.sub}>{sub}</AppText> : null}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: ms(18), paddingHorizontal: s(14), paddingVertical: vs(14), minHeight: vs(88), justifyContent: 'flex-start' },
  compact: { minHeight: 0, paddingVertical: vs(14) },
  outlined: { borderWidth: 1.5, borderColor: colors.line },
  iconBox: { width: ms(40), height: ms(40), borderRadius: ms(12), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: vs(14) },
  title: { marginTop: vs(2) },
  value: { marginTop: vs(2) },
  sub: { marginTop: vs(10) },
  pressed: { opacity: 0.85 },
});
