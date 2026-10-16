/* Page wrapper: safe areas, app background, optional scrolling. Every screen starts with <Screen>. */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export default function Screen({ children, scroll = true, padded = true, edges = ['top', 'left', 'right'], style }) {
  const inner = [padded && styles.padded, style];
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll
        ? <ScrollView contentContainerStyle={[styles.grow, inner]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        : <View style={[styles.grow, inner]}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  grow: { flexGrow: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});
