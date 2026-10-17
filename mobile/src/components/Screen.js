/* Page wrapper: safe areas, background, optional scrolling, optional sticky footer, keyboard avoidance.
     <Screen footer={<Footer>…</Footer>}>…</Screen>
   `tabs` adds bottom space for the floating tab bar; `bg` picks the page colour (surface | canvas | dark).
   When the keyboard opens, the content and the footer move up with it (iOS pads, Android resizes the window via
   adjustResize in the manifest) and dragging the list dismisses it. */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gutter, tabBarSpace, vs } from '../theme';

export default function Screen({ children, scroll = true, padded = true, tabs = false, bg = 'surface', footer, edges, style, contentStyle, keyboard = 'handled', stickyHeaderIndices, avoidKeyboard = true }) {
  const edgeList = edges || (footer ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']);
  const inner = [padded && styles.padded, tabs && { paddingBottom: tabBarSpace }, contentStyle];
  const body = scroll
    ? <ScrollView style={styles.grow} contentContainerStyle={[styles.growContent, inner]} keyboardShouldPersistTaps={keyboard} keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} stickyHeaderIndices={stickyHeaderIndices} automaticallyAdjustKeyboardInsets={false}>{children}</ScrollView>
    : <View style={[styles.grow, inner]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors[bg] || bg }, style]} edges={edgeList}>
      <KeyboardAvoidingView style={styles.grow} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={avoidKeyboard}>
        {body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  grow: { flex: 1 },
  growContent: { flexGrow: 1, paddingBottom: vs(24) },
  padded: { paddingHorizontal: gutter },
});
