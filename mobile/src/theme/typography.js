/*
 * Text styles. The brand fonts (Bricolage Grotesque for headings, IBM Plex Sans for body, IBM Plex Mono for amounts and
 * codes) are added in src/assets/fonts when the design arrives; until then the system font is used.
 */
import { Platform } from 'react-native';
import { ms } from './metrics';

export const fonts = {
  display: undefined,
  body: undefined,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
};

export const typography = {
  h1: { fontFamily: fonts.display, fontSize: ms(24), lineHeight: ms(30), fontWeight: '700' },
  h2: { fontFamily: fonts.display, fontSize: ms(18), lineHeight: ms(24), fontWeight: '700' },
  h3: { fontFamily: fonts.display, fontSize: ms(16), lineHeight: ms(22), fontWeight: '600' },
  body: { fontFamily: fonts.body, fontSize: ms(14), lineHeight: ms(21) },
  small: { fontFamily: fonts.body, fontSize: ms(12.5), lineHeight: ms(18) },
  eyebrow: { fontFamily: fonts.body, fontSize: ms(11), lineHeight: ms(14), fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  mono: { fontFamily: fonts.mono, fontSize: ms(13), lineHeight: ms(18) },
};
