/* Swipe to approve: drag the teal knob to the end to confirm; letting go early springs back. The X on the left rejects.
     <SwipeToApprove key={item.id} onApprove={approve} onReject={…} busy={saving} />   (key: a fresh knob per item)
   onApprove may return a promise — the knob waits at the end until it settles, then returns. Same on iOS and Android:
   the knob claims the touch at once and never hands it to a parent (scroll view, back-swipe). Screen readers get an
   "Approve" action instead of the drag. */
import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';
import IconButton from './IconButton';

const KNOB = 70;

export default function SwipeToApprove({ label = 'Swipe to approve', onApprove, onReject, busy = false, style }) {
  const x = useRef(new Animated.Value(0)).current;
  const [max, setMax] = useState(0);
  // the responder is created once, so it reads the latest values through refs (else: width 0 and the first invoice's onApprove)
  const live = useRef({});
  live.current = { max, onApprove, busy };
  const running = useRef(false);

  const back = () => Animated.spring(x, { toValue: 0, damping: 18, stiffness: 200, useNativeDriver: true }).start();
  const fire = async () => {
    const { onApprove: cb } = live.current;
    running.current = true;
    try { await (cb && cb()); } finally { running.current = false; back(); }
  };
  const fireRef = useRef(fire);
  fireRef.current = fire;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !running.current && !live.current.busy && live.current.max > 0,
    onMoveShouldSetPanResponder: () => !running.current && !live.current.busy && live.current.max > 0,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => x.stopAnimation(),
    onPanResponderMove: (_, g) => x.setValue(Math.min(live.current.max, Math.max(0, g.dx))),
    onPanResponderRelease: (_, g) => {
      const m = live.current.max;
      if (g.dx >= m * 0.85 || (g.vx > 1.2 && g.dx >= m * 0.5)) {
        Animated.timing(x, { toValue: m, duration: 120, useNativeDriver: true }).start(() => fireRef.current());
      } else back();
    },
    onPanResponderTerminate: back,
  })).current;


  const fadeLabel = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <View style={[styles.row, style]}>
      <IconButton name="x" onPress={onReject} disabled={busy} size={60} iconSize={24} color={colors.coral} style={styles.reject} accessibilityLabel="Reject" />
      <View style={styles.track} onLayout={e => setMax(Math.max(0, e.nativeEvent.layout.width - ms(KNOB) - ms(8)))}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityState={{ disabled: busy, busy }}
        accessibilityActions={[{ name: 'activate', label: 'Approve' }]}
        onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate' && !busy && !running.current) fire(); }}>
        <Animated.View style={[styles.label, { opacity: fadeLabel }]} pointerEvents="none">
          <AppText variant="title" color={colors.teal}>{label}</AppText>
        </Animated.View>
        <Animated.View {...pan.panHandlers} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={[styles.knob, busy && styles.knobBusy, { transform: [{ translateX: x }] }]}>
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
  knobBusy: { opacity: 0.6 },
});
