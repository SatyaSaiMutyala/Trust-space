/* All text goes through AppText so fonts, sizes and colours come from the theme.
   variant: a key of typography (display, h1…h4, title, body, small, caption, label, mono, monoLg…)
   weight: regular | medium | semibold | bold (swaps the Plex family — never use fontWeight with custom fonts)
   color: a colour name from the theme (ink, muted, teal, coralInk…) or any hex string. */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, typography, bodyFamily, monoFamily } from '../theme';

export default function AppText({ variant = 'body', weight, color = 'ink', center, right, mono, style, children, ...rest }) {
  const base = typography[variant] || typography.body;
  const extra = {};
  if (mono) extra.fontFamily = monoFamily(weight);
  else if (weight && base.fontFamily.startsWith('IBMPlexSans')) extra.fontFamily = bodyFamily(weight);
  else if (weight && base.fontFamily.startsWith('IBMPlexMono')) extra.fontFamily = monoFamily(weight);
  const c = colors[color] || color;
  return (
    <Text {...rest} style={[base, { color: c }, extra, center && styles.center, right && styles.right, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' }, right: { textAlign: 'right' } });
