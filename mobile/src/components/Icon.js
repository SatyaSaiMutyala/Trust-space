/* Line icons (24 × 24 grid, stroke based) drawn with react-native-svg. Usage: <Icon name="home" size={24} color={colors.teal} /> */
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors, ms } from '../theme';

const P = (d, extra) => ({ d, ...extra });

const ICONS = {
  home: [P('M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z')],
  building: [P('M4 21V8.5L12 3l8 5.5V21'), P('M9 21v-6h6v6'), P('M2 21h20')],
  inspect: [P('M9 5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2'), P('M9 3h6v4H9z'), P('m9 14 2 2 4-4')],
  wrench: [P('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z')],
  message: [P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
  menu: [P('M4 7h16M4 12h16M4 17h16')],
  search: [{ circle: [11, 11, 7] }, P('m21 21-4.3-4.3')],
  bell: [P('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), P('M10.3 21a1.94 1.94 0 0 0 3.4 0')],
  'chevron-left': [P('m15 18-6-6 6-6')],
  'chevron-right': [P('m9 18 6-6-6-6')],
  'chevron-down': [P('m6 9 6 6 6-6')],
  'chevron-up': [P('m18 15-6-6-6 6')],
  eye: [P('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z'), { circle: [12, 12, 3] }],
  'eye-off': [P('M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68'), P('M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61'), P('M14.12 14.12a3 3 0 1 1-4.24-4.24'), P('m2 2 20 20')],
  check: [P('M20 6 9 17l-5-5')],
  x: [P('M18 6 6 18M6 6l12 12')],
  plus: [P('M12 5v14M5 12h14')],
  minus: [P('M5 12h14')],
  camera: [P('M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z'), { circle: [12, 13, 3.2] }],
  play: [P('M8 5.5v13l11-6.5z', { fill: true })],
  more: [{ circle: [5, 12, 1.4, true] }, { circle: [12, 12, 1.4, true] }, { circle: [19, 12, 1.4, true] }],
  file: [P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), P('M14 2v6h6')],
  'file-text': [P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), P('M14 2v6h6'), P('M16 13H8M16 17H8')],
  'file-check': [P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), P('M14 2v6h6'), P('m9 15 2 2 4-4')],
  'file-list': [P('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'), P('M14 2v6h6'), P('M8 12h8M8 16h8')],
  ledger: [{ rect: [4, 3, 16, 18, 2] }, P('M8 8h8M8 12h8M8 16h5')],
  'rent-roll': [{ rect: [3, 4, 18, 16, 2] }, P('M3 9h18M9 9v11M15 9v11')],
  upload: [P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), P('m17 8-5-5-5 5'), P('M12 3v12')],
  pencil: [P('M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z')],
  'credit-card': [{ rect: [2, 5, 20, 14, 2] }, P('M2 10h20')],
  'map-pin': [P('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'), { circle: [12, 10, 3] }],
  users: [P('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'), { circle: [9, 7, 4] }, P('M23 21v-2a4 4 0 0 0-3-3.87'), P('M16 3.13a4 4 0 0 1 0 7.75')],
  calendar: [{ rect: [3, 4, 18, 17, 2] }, P('M16 2v4M8 2v4M3 10h18')],
  paperclip: [P('m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48')],
  'arrow-right': [P('M5 12h14M12 5l7 7-7 7')],
  'alert-triangle': [P('M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'), P('M12 9v4M12 17h.01')],
  'alert-circle': [{ circle: [12, 12, 9] }, P('M12 8v4M12 16h.01')],
  'check-circle': [{ circle: [12, 12, 9] }, P('m8.5 12 2.5 2.5 4.5-4.5')],
  'wifi-off': [P('m2 2 20 20'), P('M8.5 16.5a5 5 0 0 1 7 0'), P('M5 12.5a10 10 0 0 1 5.2-2.4'), P('M16.7 11a10 10 0 0 1 2.3 1.5'), P('M1.4 9a16 16 0 0 1 4.7-2.9'), P('M10.7 5a16 16 0 0 1 11.9 4'), P('M12 20h.01')],
  info: [{ circle: [12, 12, 9] }, P('M12 16v-4M12 8h.01')],
  lock: [{ rect: [4, 11, 16, 10, 2] }, P('M8 11V7a4 4 0 0 1 8 0v4')],
  'log-out': [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), P('m16 17 5-5-5-5M21 12H9')],
  globe: [{ circle: [12, 12, 9] }, P('M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18')],
  download: [P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), P('m7 10 5 5 5-5'), P('M12 15V3')],
  send: [P('m22 2-7 20-4-9-9-4z'), P('M22 2 11 13')],
  mic: [{ rect: [9, 2, 6, 12, 3] }, P('M5 10a7 7 0 0 0 14 0M12 19v3')],
  'map': [P('m1 6 7-3 8 3 7-3v15l-7 3-8-3-7 3z'), P('M8 3v15M16 6v15')],
  dot: [{ circle: [12, 12, 4, true] }],
};

export default function Icon({ name, size = 24, color = colors.ink, strokeWidth = 1.8, style }) {
  const parts = ICONS[name] || ICONS.info;
  const sz = ms(size);
  return (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={style}>
      {parts.map((p, i) => {
        if (p.circle) {
          const [cx, cy, r, filled] = p.circle;
          return <Circle key={i} cx={cx} cy={cy} r={r} stroke={filled ? 'none' : color} fill={filled ? color : 'none'} strokeWidth={strokeWidth} />;
        }
        if (p.rect) {
          const [x, y, w, h, rx] = p.rect;
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} stroke={color} strokeWidth={strokeWidth} />;
        }
        return <Path key={i} d={p.d} stroke={p.fill ? 'none' : color} fill={p.fill ? color : 'none'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </Svg>
  );
}

export const ICON_NAMES = Object.keys(ICONS);
