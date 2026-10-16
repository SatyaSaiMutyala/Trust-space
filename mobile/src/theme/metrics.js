/*
 * Responsive sizes (react-native-size-matters). Use these instead of raw numbers so layouts scale across phones:
 *   s(n)   horizontal sizes — widths, horizontal padding/margins
 *   vs(n)  vertical sizes — heights, vertical padding/margins
 *   ms(n)  moderate scale — font sizes, radii, icons (scales less than s)
 */
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

export const s = scale;
export const vs = verticalScale;
export const ms = (size, factor = 0.4) => moderateScale(size, factor);

export const spacing = {
  xs: s(4),
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(24),
  xxl: s(32),
};

export const radius = {
  sm: ms(6),
  md: ms(8),
  lg: ms(12),
  pill: 999,
};

/** Minimum touch target (44 pt). */
export const hitSize = ms(44);
