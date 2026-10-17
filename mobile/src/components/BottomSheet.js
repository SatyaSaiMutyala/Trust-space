/* Bottom sheet (modal). Slides up over a dimmed backdrop with a drag handle; optional title row with a close button.
     <BottomSheet open onClose title="All sections">…</BottomSheet> */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';
import useBottomInset from './useBottomInset';
import { colors, gutter, ms, s, vs } from '../theme';
import AppText from './AppText';
import IconButton from './IconButton';

export default function BottomSheet({ open, onClose, title, children, height, scroll = false, padded = true, footer }) {
  const y = useRef(new Animated.Value(600)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const { inset } = useBottomInset();
  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, damping: 22, stiffness: 220, mass: 0.9, useNativeDriver: true }),
      ]).start();
    } else {
      y.setValue(600); fade.setValue(0);
    }
  }, [open, y, fade]);
  if (!open) return null;
  const Body = scroll ? ScrollView : View;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[styles.sheet, height ? { height: height + inset } : { maxHeight: '92%' }, { paddingBottom: inset + vs(12), transform: [{ translateY: y }] }]}>
        <View style={styles.handle} />
        {title ? (
          <View style={[styles.titleRow, padded && styles.pad]}>
            <AppText variant="display" style={styles.title}>{title}</AppText>
            <IconButton name="x" variant="sunk" onPress={onClose} accessibilityLabel="Close" />
          </View>
        ) : null}
        <Body style={styles.body} contentContainerStyle={scroll && padded ? styles.pad : null} showsVerticalScrollIndicator={false}>
          {scroll ? children : <View style={padded && styles.pad}>{children}</View>}
        </Body>
        {footer}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(19,78,74,0.72)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopLeftRadius: ms(28), borderTopRightRadius: ms(28), paddingTop: vs(8) },
  handle: { alignSelf: 'center', width: s(40), height: vs(5), borderRadius: 3, backgroundColor: colors.line, marginBottom: vs(10) },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(14) },
  title: { fontSize: ms(27) },
  pad: { paddingHorizontal: gutter },
  body: { flexShrink: 1 },
});
