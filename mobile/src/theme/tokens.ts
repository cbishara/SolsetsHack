// Soltra design tokens. Dark always, inspired by Opal: pure black, white type,
// warm greys, cards barely lifted off the background. The interface stays
// monochrome; color belongs to Sol (the agent) and to two states: calm and
// urgent. "day" and "night" are both dark; night is dimmer, for 3 a.m. eyes.

export type Scheme = 'day' | 'night';

export type Palette = {
  scheme: Scheme;
  bg: string; // page
  surface: string; // inputs, chips, icon buttons
  card: string; // cards and grouped lists on top of bg
  line: string; // hairlines and card borders
  ink: string; // primary text
  muted: string; // secondary text (AA on bg and card)
  faint: string; // tertiary, never for essential info
  accent: string; // primary buttons, selected, links: white, Opal style
  onAccent: string;
  accentSoft: string; // selected backgrounds, neutral badges
  sol: string; // Sol's own light: the avatar, the Sol button, on-call marks
  onSol: string;
  hero: [string, string]; // hero card gradient, top-left → bottom-right
  onHero: string;
  onHeroMuted: string;
  urgent: string; // woke / must not miss
  urgentSoft: string;
  calm: string; // all good, done, toggles on
  calmSoft: string;
  glow: string; // faint ambient light at the top of a screen
  tabBar: string; // tint under the blurred tab bar
  overlay: string;
};

export const day: Palette = {
  scheme: 'day',
  bg: '#000000',
  surface: '#161618',
  card: '#0D0D0F',
  line: 'rgba(255,255,255,0.08)',
  ink: '#FFFFFF',
  muted: '#BCBBC0',
  faint: '#7A7980',
  accent: '#FFFFFF',
  onAccent: '#000000',
  accentSoft: 'rgba(255,255,255,0.10)',
  sol: '#F2CF8C',
  onSol: '#1C1407',
  hero: ['#1A1A1D', '#0A0A0B'],
  onHero: '#FFFFFF',
  onHeroMuted: '#BCBBC0',
  urgent: '#FF7B72',
  urgentSoft: 'rgba(255,123,114,0.14)',
  calm: '#86D3B6',
  calmSoft: 'rgba(134,211,182,0.12)',
  glow: '#8E9BB8',
  tabBar: 'rgba(30,30,32,0.55)',
  overlay: 'rgba(0,0,0,0.6)',
};

/** Same brand, less light: dimmer whites and softer color for the middle of the night. */
export const night: Palette = {
  scheme: 'night',
  bg: '#000000',
  surface: '#121214',
  card: '#0A0A0B',
  line: 'rgba(255,255,255,0.07)',
  ink: '#E6E6E9',
  muted: '#A09FA5',
  faint: '#6C6B71',
  accent: '#E6E6E9',
  onAccent: '#000000',
  accentSoft: 'rgba(255,255,255,0.08)',
  sol: '#E3BE7E',
  onSol: '#1C1407',
  hero: ['#141416', '#080809'],
  onHero: '#E6E6E9',
  onHeroMuted: '#A09FA5',
  urgent: '#F2756C',
  urgentSoft: 'rgba(242,117,108,0.13)',
  calm: '#79C2A6',
  calmSoft: 'rgba(121,194,166,0.11)',
  glow: '#6F7FA3',
  tabBar: 'rgba(24,24,26,0.55)',
  overlay: 'rgba(0,0,0,0.65)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, section: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 22, xl: 28, pill: 999 } as const;

export const font = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
} as const;

// Opal's ramp in Inter Tight: bold headlines with tight tracking (about -0.04em),
// semibold subheads, regular body in grey for anything secondary. Body never below 16.
export const type = {
  display: { fontFamily: font.bold, fontSize: 36, lineHeight: 40, letterSpacing: -1.5 },
  title: { fontFamily: font.bold, fontSize: 29, lineHeight: 34, letterSpacing: -1.1 },
  h2: { fontFamily: font.semibold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5 },
  h3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 17, lineHeight: 25, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 17, lineHeight: 25, letterSpacing: -0.2 },
  callout: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  calloutStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  caption: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  eyebrow: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  numeral: { fontFamily: font.semibold, fontSize: 56, lineHeight: 60, letterSpacing: -2.4, fontVariant: ['tabular-nums' as const] },
} as const;

export type TypeVariant = keyof typeof type;

export const size = { target: 48, fab: 56, tabBar: 64 } as const;

/**
 * Motion. Values from the expo-animation skill: press feedback under 150 ms,
 * small state changes under 200 ms, springs only when a finger is involved.
 */
export const motion = {
  fast: 120, // press feedback
  base: 200, // toggles, chips, small state changes
  moderate: 320, // larger surfaces that are not native sheets
  pressScale: 0.97,
  /** Strong ease-out for UI, as cubic-bezier control points. */
  easeOut: [0.23, 1, 0.32, 1] as const,
  easeInOut: [0.77, 0, 0.175, 1] as const,
  spring: {
    settle: { duration: 400, dampingRatio: 1 },
    snapBack: { duration: 400, dampingRatio: 0.8 },
    sheet: { duration: 300, dampingRatio: 0.8 },
  },
  /** Sol breathes slower the calmer things are. One full breath, in ms. */
  breath: { calm: 5200, watching: 3600, waking: 1400 },
} as const;

/** Extra bottom padding a scrolling screen needs so the floating tab bar never covers content. */
export const bottomInset = size.tabBar + space.section + space.xxl;
