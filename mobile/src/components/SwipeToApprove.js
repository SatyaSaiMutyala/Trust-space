/* Swipe to approve: drag the teal knob to the end to confirm; letting go early springs back. The X on the left rejects. */
import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import IconButton from './IconButton';

const KNOB = 70;

export default function SwipeToApprove({ label = 'Swipe to approve', onApprove, onReject, style }) {
  const x = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);
  const max = Math.max(0, trackW - ms(KNOB) - ms(8));
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
    onPanResponderMove: (_, g) => x.setValue(Math.min(max, Math.max(0, g.dx))),
    onPanResponderRelease: (_, g) => {
      if (g.dx >= max * 0.85 && max > 0) {
        Animated.timing(x, { toValue: max, duration: 120, useNativeDriver: true }).start(() => { onApprove && onApprove(); Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(); });
      } else Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  return (
    <View style={[styles.row, style]}>
      <IconButton name="x" onPress={onReject} size={60} iconSize={24} color={colors.coral} style={styles.reject} accessibilityLabel="Reject" />
      <View style={styles.track} onLayout={e => setTrackW(e.nativeEvent.layout.width)}>
        <AppText variant="title" color={colors.teal} style={styles.label}>{label}</AppText>
        <Animated.View {...pan.panHandlers} style={[styles.knob, { transform: [{ translateX: x }] }]}>
          <Icon name="arrow-right" size={24} color={colors.white} strokeWidth={2.2} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  reject: { borderRadius: ms(18), borderWidth: 2, borderColor: '#EFC3AE', backgroundColor: colors.white },
  track: { flex: 1, height: vs(60), borderRadius: ms(18), backgroundColor: colors.tealTint, justifyContent: 'center' },
  label: { position: 'absolute', right: s(20) },
  knob: { position: 'absolute', left: ms(4), width: ms(KNOB), height: vs(52), borderRadius: ms(15), backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
});
