/* Teal hero card with faint concentric arcs. `arch` makes the top a full semicircle (owner home). */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, ms, s, vs } from '../theme';

export default function HeroCard({ children, arch, style, bg = colors.teal, arcs = 'corner', padding = true }) {
  const [w, setW] = useState(0);
  const archStyle = arch && w ? { borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 } : null;
  return (
    <View onLayout={e => setW(e.nativeEvent.layout.width)} style={[styles.card, { backgroundColor: bg }, archStyle, padding && styles.pad, style]}>
      {w && arcs !== 'none' ? (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${w} ${w}`} preserveAspectRatio="xMidYMid slice">
          {arcs === 'corner'
            ? [0.28, 0.42, 0.56].map(r => <Circle key={r} cx={w * 0.72} cy={w * 0.62} r={w * r} stroke={colors.onTealLine} strokeWidth={1.5} fill="none" />)
            : [0.62, 0.75, 0.88].map(r => <Path key={r} d={`M ${w / 2 - w * r / 2} ${w} A ${w * r / 2} ${w * r / 2} 0 0 1 ${w / 2 + w * r / 2} ${w}`} stroke={colors.onTealLine} strokeWidth={1.5} fill="none" />)}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: ms(22), overflow: 'hidden' },
  pad: { paddingHorizontal: s(18), paddingVertical: vs(18) },
});
