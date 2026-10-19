/* Finger signature pad: strokes are drawn as SVG paths and returned as one path string ("M x y L x y …") with the
   pad's size, so the signature can be stored with the record and redrawn anywhere.
     <SignaturePad value={sig} onChange={setSig} height={150} />   sig = { d, w, h } | null */
import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';

export default function SignaturePad({ value, onChange, height = 150, style }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState(''); // the stroke being drawn
  const strokes = useRef(value?.d || '');
  const cur = useRef('');
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // keep the gesture while the parent scroll view would like it
    onPanResponderGrant: e => { const { locationX: x, locationY: y } = e.nativeEvent; cur.current = `M${x.toFixed(1)} ${y.toFixed(1)}`; setLive(cur.current); },
    onPanResponderMove: e => { const { locationX: x, locationY: y } = e.nativeEvent; cur.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`; setLive(cur.current); },
    onPanResponderRelease: () => finish(),
    onPanResponderTerminate: () => finish(),
  })).current;
  const finish = () => {
    if (!cur.current) return;
    const seg = cur.current.includes('L') ? cur.current : cur.current + ' L' + cur.current.slice(1); // a tap draws a dot
    strokes.current = strokes.current ? `${strokes.current} ${seg}` : seg;
    cur.current = ''; setLive('');
    onChange && onChange({ d: strokes.current, w: Math.round(size.w), h: Math.round(size.h) });
  };
  const clear = () => { strokes.current = ''; cur.current = ''; setLive(''); onChange && onChange(null); };
  const d = strokes.current || value?.d || '';
  return (
    <View style={[styles.pad, { height: vs(height) }, style]} onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers}
      accessibilityLabel="Signature pad" accessibilityHint="Sign with your finger">
      <Svg width="100%" height="100%" pointerEvents="none">
        {d ? <Path d={d} stroke={colors.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {live ? <Path d={live} stroke={colors.ink} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </Svg>
      <View style={styles.line} pointerEvents="none" />
      {!d && !live ? <AppText variant="small" color="muted" center style={styles.hint} pointerEvents="none">Sign here with your finger</AppText> : null}
      {d ? <Pressable style={styles.clear} hitSlop={10} onPress={clear} accessibilityRole="button" accessibilityLabel="Clear signature"><AppText variant="title" color="muted">Clear</AppText></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { backgroundColor: colors.sunk, borderRadius: ms(16), overflow: 'hidden' },
  line: { position: 'absolute', left: s(18), right: s(18), bottom: vs(26), height: 1, backgroundColor: colors.line },
  hint: { position: 'absolute', left: 0, right: 0, bottom: vs(8) },
  clear: { position: 'absolute', right: s(14), top: vs(10) },
});
