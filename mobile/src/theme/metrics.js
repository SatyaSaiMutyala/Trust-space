/*
 * Responsive sizes. Built on react-native-size-matters but re-based to the design frame (390 × 844 pt, iPhone 14/15/16/17)
 * instead of the library's 350 × 680 default, so a value here renders 1:1 on the design phone, a little smaller on
 * compact phones and a little larger on big ones (the default base inflated everything by 12–24 %).
 *   s(n)   horizontal sizes — widths, horizontal padding/margins
 *   vs(n)  vertical sizes — heights, vertical padding/margins
 *   ms(n)  moderate scale — font sizes, radii, icons (scales less than s)
 */
import { scale, verticalScale } from 'react-native-size-matters';

const BASE_W = 390, BASE_H = 844, LIB_W = 350, LIB_H = 680;

export const s = n => scale(n) * (LIB_W / BASE_W);
export const vs = n => verticalScale(n) * (LIB_H / BASE_H);
export const ms = (n, factor = 0.35) => n + (s(n) - n) * factor;

export const spacing = {
  xs: s(4),
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(20), // page gutter
  xxl: s(28),
  xxxl: s(36),
};

/** Page gutter (left/right padding of every screen). */
export const gutter = s(20);

export const radius = {
  xs: ms(8),
  sm: ms(12),
  md: ms(16),
  lg: ms(20),
  xl: ms(24),
  xxl: ms(28),
  pill: 999,
};

/** Minimum touch target (44 pt). */
export const hitSize = ms(44);

/** Height of the floating tab bar incl. its margin, used as bottom padding on tab screens. */
export const tabBarSpace = vs(88);

/** Cross-platform soft shadows (RN boxShadow works on iOS and Android with the new architecture). */
export const shadows = {
  card: { boxShadow: '0 6px 24px rgba(16,32,30,0.08)' },
  float: { boxShadow: '0 8px 28px rgba(16,32,30,0.14)' },
  button: { boxShadow: '0 2px 8px rgba(16,32,30,0.10)' },
  sheet: { boxShadow: '0 -8px 28px rgba(16,32,30,0.16)' },
};
