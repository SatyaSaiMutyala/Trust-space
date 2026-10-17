/* White card. borderColor for the outlined message cards (deep teal notice, blue approval request); tone for tinted ones. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs, shadows } from '../theme';

const BG = { white: colors.white, mist: colors.tealTint, amber: colors.amberTint, coral: colors.coralTint, blue: colors.blueTint, grey: colors.sunk, dark: colors.darkCard };

export default function Card({ children, tone = 'white', borderColor, outlined, shadow, onPress, style, padding = true, radius = 20 }) {
  const Wrap = onPress ? Pressable : View;
  const cardStyle = [styles.card, { backgroundColor: BG[tone] || tone, borderRadius: ms(radius) }, padding && styles.pad, (borderColor || outlined) && { borderWidth: 2, borderColor: borderColor || colors.line }, shadow && shadows.card, style];
  return (
    <Wrap onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={onPress ? ({ pressed }) => [...cardStyle, pressed && styles.pressed] : cardStyle}>
      {children}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  pad: { paddingHorizontal: s(18), paddingVertical: vs(16) },
  pressed: { opacity: 0.9 },
});
