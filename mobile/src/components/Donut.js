/* Ring charts. <Donut segments=[{value,color}] /> full ring; <Gauge value=0.72 /> half ring (opens downwards);
   <Ring value=0.24 /> small progress ring. Children render in the centre. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, ms } from '../theme';

export function Donut({ size = 80, stroke = 9, segments = [], track = colors.onTealLine, children, style }) {
  const sz = ms(size), st = ms(stroke), r = (sz - st) / 2, c = 2 * Math.PI * r;
  const total = segments.reduce((a, x) => a + x.value, 0) || 1;
  let offset = 0;
  return (
    <View style={[{ width: sz, height: sz }, styles.center, style]}>
      <Svg width={sz} height={sz} style={StyleSheet.absoluteFill}>
        <Circle cx={sz / 2} cy={sz / 2} r={r} stroke={track} strokeWidth={st} fill="none" />
        {segments.map((sg, i) => {
          // the last segment runs to the exact end of the ring, so rounding never leaves a hairline gap
          const len = i === segments.length - 1 ? c - offset : (sg.value / total) * c;
          const el = <Circle key={i} cx={sz / 2} cy={sz / 2} r={r} stroke={sg.color} strokeWidth={st} fill="none" strokeDasharray={`${len + 0.5} ${Math.max(0, c - len - 0.5)}`} strokeDashoffset={-offset} strokeLinecap="butt" transform={`rotate(-90 ${sz / 2} ${sz / 2})`} />;
          offset += len;
          return el;
        })}
      </Svg>
      {children}
    </View>
  );
}

/** Half ring, 180°, drawn from left to right over the top. */
export function Gauge({ width = 260, stroke = 12, value = 0.7, color = colors.white, track = 'rgba(255,255,255,0.28)', knob, children, style }) {
  const w = ms(width), st = ms(stroke), r = (w - st) / 2, cx = w / 2, cy = r + st / 2;
  const h = cy + st;
  const ang = Math.PI * Math.min(1, Math.max(0, value));
  const px = cx - r * Math.cos(ang), py = cy - r * Math.sin(ang);
  return (
    <View style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h}>
        <Path d={`M ${st / 2} ${cy} A ${r} ${r} 0 0 1 ${w - st / 2} ${cy}`} stroke={track} strokeWidth={st} fill="none" strokeLinecap="round" />
        {value > 0 ? <Path d={`M ${st / 2} ${cy} A ${r} ${r} 0 ${ang > Math.PI ? 1 : 0} 1 ${px} ${py}`} stroke={color} strokeWidth={st} fill="none" strokeLinecap="round" /> : null}
        {knob ? <Circle cx={px} cy={py} r={st * 1.1} fill={knob} /> : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, { paddingTop: h * 0.25 }]}>{children}</View>
    </View>
  );
}

export function Ring({ size = 44, stroke = 5, value = 0.3, color = colors.amber, track = 'rgba(224,165,38,0.25)', children, style }) {
  const sz = ms(size), st = ms(stroke), r = (sz - st) / 2, c = 2 * Math.PI * r, len = c * Math.min(1, Math.max(0, value));
  return (
    <View style={[{ width: sz, height: sz }, styles.center, style]}>
      <Svg width={sz} height={sz} style={StyleSheet.absoluteFill}>
        <Circle cx={sz / 2} cy={sz / 2} r={r} stroke={track} strokeWidth={st} fill="none" />
        <Circle cx={sz / 2} cy={sz / 2} r={r} stroke={color} strokeWidth={st} fill="none" strokeDasharray={`${len} ${c - len}`} strokeLinecap="round" transform={`rotate(-90 ${sz / 2} ${sz / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' } });
