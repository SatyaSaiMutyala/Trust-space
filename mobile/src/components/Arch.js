/* Arch shapes — the design's signature for photos and progress.
   <Arch> is the shape (full semicircle top, soft bottom corners) with a photo gradient or a flat fill, dashed states.
   <PhotoArch state="photo|uploading|needed|optional|add|failed|waiting" label sub progress /> is the capture tile. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, ms, s, vs } from '../theme';
import AppText from './AppText';
import Icon from './Icon';

export function PhotoGradient({ dark }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={dark ? '#4F6D66' : '#7A9A92'} />
          <Stop offset="1" stopColor={dark ? '#20332F' : '#3E5C55'} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#g)" />
    </Svg>
  );
}

export default function Arch({ width, height, ratio = 1.1, photo, dark, bg, dashed, dashColor = colors.line, bottomRadius = 24, children, style, onPress, flat }) {
  const [w, setW] = useState(width ? ms(width) : 0);
  const h = height ? ms(height) : w ? w * ratio : 0;
  const Wrap = onPress ? Pressable : View;
  const top = flat ? ms(bottomRadius) : w / 2;
  return (
    <Wrap onPress={onPress} onLayout={width ? undefined : e => setW(e.nativeEvent.layout.width)}
      style={[styles.arch, width ? { width: w } : styles.fill, { height: h || undefined, backgroundColor: bg || (photo ? colors.photo : colors.sunk), borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: ms(bottomRadius), borderBottomRightRadius: ms(bottomRadius) },
        dashed && { borderWidth: 2, borderStyle: 'dashed', borderColor: dashColor }, style]}>
      {photo && w ? <PhotoGradient dark={dark} /> : null}
      {children}
    </Wrap>
  );
}

export function PhotoArch({ state = 'photo', label, sub, progress = 0.62, onPress, style, ratio = 1.1, width, labelPosition = 'left' }) {
  const isPhoto = state === 'photo' || state === 'uploading' || state === 'waiting';
  const needed = state === 'needed', optional = state === 'optional' || state === 'add', failed = state === 'failed';
  const fg = needed || state === 'photo' ? colors.teal : failed ? colors.coral : colors.muted;
  return (
    <Arch width={width} ratio={ratio} onPress={onPress} photo={isPhoto} dark={state === 'uploading'}
      bg={needed ? '#EEF6F4' : failed ? colors.coralTint : optional ? colors.surface : undefined}
      dashed={needed || optional} dashColor={needed ? colors.teal : '#B9C8C4'} style={style}>
      {state === 'photo' ? <View style={styles.check}><Icon name="check" size={18} color={colors.teal} strokeWidth={2.4} /></View> : null}
      {state === 'uploading' ? (
        <View style={styles.centerBox}>
          <AppText variant="title" color="white">Uploading {Math.round(progress * 100)}%</AppText>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${progress * 100}%` }]} /></View>
        </View>
      ) : null}
      {!isPhoto ? (
        <View style={styles.centerBox}>
          <Icon name={state === 'add' ? 'plus' : failed ? 'alert-triangle' : 'camera'} size={30} color={fg} strokeWidth={1.6} />
          {label ? <AppText variant="h4" weight="semibold" color={fg} center style={styles.needLabel}>{label}</AppText> : null}
          {sub ? <AppText variant="small" color={failed ? colors.coralInk : colors.muted} center style={failed && styles.underline}>{sub}</AppText> : null}
        </View>
      ) : null}
      {isPhoto && label ? (
        labelPosition === 'chip'
          ? <View style={styles.chip}><AppText variant="captionSemi" color="white">{label}</AppText></View>
          : <View style={styles.labelWrap}><AppText variant="title" color="white" numberOfLines={1}>{label}</AppText></View>
      ) : null}
    </Arch>
  );
}

const styles = StyleSheet.create({
  arch: { overflow: 'hidden', alignItems: 'stretch' },
  fill: { flex: 1, alignSelf: 'stretch' },
  check: { position: 'absolute', top: vs(18), alignSelf: 'center', width: ms(32), height: ms(32), borderRadius: ms(16), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: vs(6), paddingHorizontal: s(14) },
  needLabel: { marginTop: vs(4) },
  bar: { width: '80%', height: vs(6), borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: vs(6), overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.white, borderRadius: 3 },
  labelWrap: { position: 'absolute', left: s(14), right: s(14), bottom: vs(12) },
  chip: { position: 'absolute', bottom: vs(8), alignSelf: 'center', backgroundColor: 'rgba(16,32,30,0.8)', borderRadius: 999, paddingHorizontal: s(8), paddingVertical: vs(2) },
  underline: { textDecorationLine: 'underline' },
});
