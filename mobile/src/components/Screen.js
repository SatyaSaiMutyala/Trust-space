/* Page wrapper: safe areas, background, optional scrolling, optional pinned header and sticky footer, keyboard avoidance.
     <Screen header={<View>…</View>} footer={<Footer>…</Footer>}>…</Screen>   (header and footer never scroll)
   `tabs` adds bottom space for the floating tab bar; `bg` picks the page colour (surface | canvas | dark).
   When the keyboard opens, the content and the footer move up with it (iOS pads, Android resizes the window via
   adjustResize in the manifest) and dragging the list dismisses it. */
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useBottomInset from './useBottomInset';
import { colors, gutter, tabBarSpace, vs } from '../theme';

export default function Screen({ children, scroll = true, padded = true, tabs = false, bg = 'surface', topBg, header, footer, edges, style, contentStyle, keyboard = 'handled', stickyHeaderIndices, avoidKeyboard = true }) {
  const { gap } = useBottomInset();
  // Tab screens: the floating bar is absolute, so the scroll content needs room for the bar plus its clearance from the edge.
  const edgeList = edges || (footer || tabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']);
  const inner = [padded && styles.padded, tabs && { paddingBottom: tabBarSpace + gap(vs(10)) }, contentStyle];
  const body = scroll
    ? <ScrollView style={styles.grow} contentContainerStyle={[styles.growContent, inner]} keyboardShouldPersistTaps={keyboard} keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} stickyHeaderIndices={stickyHeaderIndices} automaticallyAdjustKeyboardInsets={false}>{children}</ScrollView>
    : <View style={[styles.grow, inner]}>{children}</View>;
  return (
    // topBg colours the status-bar strip (the safe area) separately, e.g. a white pinned header over a grey page
    <SafeAreaView style={[styles.safe, { backgroundColor: colors[topBg || bg] || topBg || bg }, style]} edges={edgeList}>
      <KeyboardAvoidingView style={[styles.grow, { backgroundColor: colors[bg] || bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={avoidKeyboard}>
        {header}
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
