/*
 * Text styles. Bricolage Grotesque 600 for headings, IBM Plex Sans for body, IBM Plex Mono for amounts and codes.
 * Font files live in src/assets/fonts (linked via react-native.config.js). Never set fontWeight with these families —
 * pick the weight through the family name so iOS and Android render the same face.
 */
import { ms } from './metrics';

export const fonts = {
  display: 'BricolageGrotesque-SemiBold',
  displayBold: 'BricolageGrotesque-Bold',
  body: 'IBMPlexSans-Regular',
  bodyMedium: 'IBMPlexSans-Medium',
  bodySemi: 'IBMPlexSans-SemiBold',
  bodyBold: 'IBMPlexSans-Bold',
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
  monoSemi: 'IBMPlexMono-SemiBold',
};

/** Body family for a weight name. */
export const bodyFamily = weight =>
  weight === 'bold' ? fonts.bodyBold : weight === 'semibold' ? fonts.bodySemi : weight === 'medium' ? fonts.bodyMedium : fonts.body;
export const monoFamily = weight => (weight === 'bold' || weight === 'semibold' ? fonts.monoSemi : weight === 'medium' ? fonts.monoMedium : fonts.mono);

const t = (fontFamily, size, line, extra) => ({ fontFamily, fontSize: ms(size), lineHeight: ms(line), ...extra });

export const typography = {
  display: t(fonts.display, 32, 38), // "Overview", "Rent roll"
  h1: t(fonts.display, 27, 32), // "Welcome back", "Begumpet Central Lab"
  h2: t(fonts.display, 22, 27), // "Needs you today", "Owners"
  h3: t(fonts.display, 18, 23), // "September is 9 days late", card titles
  h4: t(fonts.display, 16, 21),
  title: t(fonts.bodySemi, 15, 20), // list row titles, chip labels, input text
  body: t(fonts.body, 14.5, 21),
  bodyMedium: t(fonts.bodyMedium, 14.5, 21),
  bodySemi: t(fonts.bodySemi, 14.5, 21),
  small: t(fonts.body, 13, 18),
  smallSemi: t(fonts.bodySemi, 13, 18),
  caption: t(fonts.body, 11.5, 15),
  captionSemi: t(fonts.bodySemi, 11.5, 15),
  label: t(fonts.bodySemi, 14, 19), // field labels
  button: t(fonts.bodySemi, 15.5, 20),
  buttonSmall: t(fonts.bodySemi, 14, 18),
  eyebrow: t(fonts.bodySemi, 11.5, 15, { letterSpacing: 0.4 }),
  mono: t(fonts.mono, 14, 19),
  monoSmall: t(fonts.mono, 12, 16),
  monoMd: t(fonts.monoMedium, 16, 21), // list amounts
  monoLg: t(fonts.monoMedium, 20, 25), // tile values
  monoXl: t(fonts.monoMedium, 27, 32), // hero amounts
  monoXxl: t(fonts.monoMedium, 36, 42), // "₹2,59,200" on To approve
};
