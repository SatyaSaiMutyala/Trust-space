/* Page wrapper: safe areas, background, optional scrolling, optional pinned header and sticky footer, keyboard avoidance.
     <Screen header={<View>…</View>} footer={<Footer>…</Footer>}>…</Screen>   (header and footer never scroll)
   `tabs` adds bottom space for the floating tab bar; `bg` picks the page colour (surface | canvas | dark).

   Keyboard (iOS and Android edge-to-edge alike): the page is padded by exactly the part the keyboard covers, so the
   content and the sticky footer (buttons, chat composer) sit right above it; the focused field is scrolled into view —
   when the keyboard opens and whenever another field gets focus (Input / OtpInput call reveal through KeyboardScope);
   scrolling keeps the keyboard open (tap outside a field or the keyboard key to close it). `avoidKeyboard={false}` turns all of this off for a screen. */
import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useBottomInset from './useBottomInset';
import useKeyboardOverlap, { KeyboardScope, useReveal } from './useKeyboardOverlap';
import { colors, gutter, tabBarSpace, vs } from '../theme';

export { KeyboardScope };

export default function Screen({ children, scroll = true, padded = true, tabs = false, bg = 'surface', topBg, header, footer, edges, style, contentStyle, keyboard = 'handled', stickyHeaderIndices, avoidKeyboard = true }) {
  const { gap } = useBottomInset();
  const boxRef = useRef(null);
  const scrollRef = useRef(null);
  const overlap = useKeyboardOverlap(boxRef, avoidKeyboard);
  const { reveal, onScroll, onLayout } = useReveal(scrollRef, overlap, avoidKeyboard);
  const scope = useMemo(() => ({ overlap, reveal }), [overlap, reveal]);

  // Tab screens: the floating bar is absolute, so the scroll content needs room for the bar plus its clearance from the edge.
  const edgeList = edges || (footer || tabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']);
  const inner = [padded && styles.padded, tabs && { paddingBottom: tabBarSpace + gap(vs(10)) }, contentStyle];
  const body = scroll
    ? <ScrollView ref={scrollRef} style={styles.grow} contentContainerStyle={[styles.growContent, inner]} keyboardShouldPersistTaps={keyboard} keyboardDismissMode="none"
        showsVerticalScrollIndicator={false} stickyHeaderIndices={stickyHeaderIndices} automaticallyAdjustKeyboardInsets={false}
        onScroll={onScroll} scrollEventThrottle={32}
        onLayout={onLayout}>{children}</ScrollView>
    : <View style={[styles.grow, inner]}>{children}</View>;
  return (
    // topBg colours the status-bar strip (the safe area) separately, e.g. a white pinned header over a grey page
    <SafeAreaView style={[styles.safe, { backgroundColor: colors[topBg || bg] || topBg || bg }, style]} edges={edgeList}>
      <KeyboardScope.Provider value={scope}>
        <View ref={boxRef} style={[styles.grow, { backgroundColor: colors[bg] || bg, paddingBottom: overlap }]}>
          {header}
          {body}
          {footer}
        </View>
      </KeyboardScope.Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  grow: { flex: 1 },
  growContent: { flexGrow: 1, paddingBottom: vs(24) },
  padded: { paddingHorizontal: gutter },
});
