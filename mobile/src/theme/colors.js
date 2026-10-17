/*
 * TruSpace mobile palette (design "TruSpace components v3 teal").
 * Teal = done / primary, Amber = waiting for you, Coral = late or failed, Blue = in process.
 * Each status colour has an `…Tint` (soft background) and an `…Ink` (text on that tint).
 */
export const colors = {
  teal: '#0F766E',
  deepTeal: '#134E4A',
  mist: '#E6F4F1',
  amber: '#E0A526',
  coral: '#C2410C',
  blue: '#1E4F8C',
  ink: '#10201E',
  muted: '#557370',

  // surfaces
  surface: '#FFFFFF',
  bg: '#FFFFFF',
  canvas: '#F2F6F5', // page background behind stacked cards (To approve)
  sunk: '#F1F5F4', // grey tiles, search field, composer
  line: '#D9E6E3', // borders, dividers
  lineSoft: '#E8F0EE',
  overlay: 'rgba(16,32,30,0.55)',
  photo: '#5E8078', // photo placeholder mid tone
  photoDark: '#2F4C46',
  dark: '#1B2B29', // video screen background
  darkCard: 'rgba(255,255,255,0.08)',

  // tints and inks
  tealTint: '#E6F4F1',
  tealInk: '#134E4A',
  amberTint: '#FBF3DD',
  amberInk: '#6E4E0C',
  coralTint: '#F9E7E0',
  coralInk: '#9A3412',
  blueTint: '#E9EEF7',
  blueInk: '#1E4F8C',
  greyTint: '#EEF2F1',
  greyInk: '#33504C',
  white: '#FFFFFF',
  onTealMuted: '#BFE3DC', // light text on teal
  onTealLine: 'rgba(255,255,255,0.22)',

  accent: '#0F766E',
  accentInk: '#FFFFFF',
};

/** Status tone → { bg, fg, dot }. Used by Chip, Tile, CountBadge, RentCell. */
export const tones = {
  teal: { bg: colors.tealTint, fg: colors.tealInk, dot: colors.teal },
  blue: { bg: colors.blueTint, fg: colors.blueInk, dot: colors.blue },
  amber: { bg: colors.amberTint, fg: colors.amberInk, dot: colors.amber },
  coral: { bg: colors.coralTint, fg: colors.coralInk, dot: colors.coral },
  grey: { bg: colors.greyTint, fg: colors.greyInk, dot: colors.muted },
  ink: { bg: colors.ink, fg: colors.white, dot: colors.white },
  white: { bg: colors.surface, fg: colors.tealInk, dot: colors.teal },
};
tones.mist = tones.teal; // alias: tiles call the teal tint "mist"

/** Map a status word to a tone (chips, cells). */
export const toneOf = status => {
  const k = String(status || '').toLowerCase();
  if (/(paid|deposited|active|good|met|done|agreed|approved|resolved|closed|verified|fine)/.test(k)) return 'teal';
  if (/(process|progress|fit-out|assessing|scrutiny|p3|normal|sent|submitted)/.test(k)) return 'blue';
  if (/(due|minor|waiting|p2|high|late|pending|draft rent|open repair|1 of)/.test(k)) return 'amber';
  if (/(overdue|damaged|missing|sla|p1|critical|terminated|not approved|failed|wrong|rejected)/.test(k)) return 'coral';
  return 'grey';
};
