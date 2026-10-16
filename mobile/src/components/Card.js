/* White panel with a border — the app's main container for groups of content. Pressable when onPress is given. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Card({ children, onPress, style }) {
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>{children}</Pressable>;
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  pressed: { borderColor: colors.muted },
});
