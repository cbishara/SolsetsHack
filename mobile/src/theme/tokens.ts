// SOL design tokens. Visual system "Mi espacio" by Amaru (official ADR
// 2026-10-23-sistema-visual-mi-espacio-con-modo-noche): white, blue #2E59E5,
// lime #E4F51A, the ↗ arrow. Night mode is the same brand: deep blue, low
// brightness, lime reserved for one action per screen.

export type Scheme = 'day' | 'night';

export type Palette = {
  scheme: Scheme;
  bg: string; // page
  surface: string; // grouped areas, input backgrounds
  card: string; // cards on top of bg
  line: string; // hairlines and card borders
  ink: string; // primary text
  muted: string; // secondary text (AA on bg and card)
  faint: string; // tertiary, never for essential info
  accent: string; // brand blue: links, selected, primary buttons
  onAccent: string;
  accentSoft: string; // selected backgrounds, badges
  lime: string; // the one highlight action
  onLime: string;
  hero: [string, string]; // hero card gradient, top-left → bottom-right
  onHero: string;
  onHeroMuted: string;
  urgent: string; // woke / must not miss
  urgentSoft: string;
  calm: string; // all good, done
  calmSoft: string;
  tabBar: string;
  overlay: string;
};

export const day: Palette = {
  scheme: 'day',
  bg: '#FFFFFF',
  surface: '#F5F7FC',
  card: '#FFFFFF',
  line: '#DFE4EE',
  ink: '#151B2E',
  muted: '#5E6477',
  faint: '#8A90A2',
  accent: '#2E59E5',
  onAccent: '#FFFFFF',
  accentSoft: '#EDF2FF',
  lime: '#E4F51A',
  onLime: '#151B2E',
  hero: ['#2E59E5', '#1B3FB8'],
  onHero: '#FFFFFF',
  onHeroMuted: '#DCE5FF',
  urgent: '#B4232F',
  urgentSoft: '#FFF0F1',
  calm: '#13795B',
  calmSoft: '#E8F6F0',
  tabBar: 'rgba(255,255,255,0.96)',
  overlay: 'rgba(9,22,51,0.42)',
};

export const night: Palette = {
  scheme: 'night',
  bg: '#070D22',
  surface: '#0D1530',
  card: '#101A3A',
  line: 'rgba(160,180,255,0.13)',
  ink: '#E7EBF6',
  muted: '#99A3C0',
  faint: '#6B7595',
  accent: '#8CA6FF',
  onAccent: '#070D22',
  accentSoft: 'rgba(140,166,255,0.14)',
  lime: '#D9EA4A',
  onLime: '#0B1230',
  hero: ['#12214F', '#0B1638'],
  onHero: '#E7EBF6',
  onHeroMuted: '#A9B4D6',
  urgent: '#FF8F86',
  urgentSoft: 'rgba(255,143,134,0.13)',
  calm: '#7FD1B1',
  calmSoft: 'rgba(127,209,177,0.12)',
  tabBar: 'rgba(7,13,34,0.96)',
  overlay: 'rgba(0,0,0,0.55)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, section: 40 } as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const font = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
} as const;

// Short, wide display type with tight tracking (Amaru's "Suelta."), body never below 16.
export const type = {
  display: { fontFamily: font.semibold, fontSize: 38, lineHeight: 42, letterSpacing: -1.6 },
  title: { fontFamily: font.semibold, fontSize: 30, lineHeight: 35, letterSpacing: -1.1 },
  h2: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
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

export const size = { target: 48, fab: 60, tabBar: 64 } as const;

export const motion = { fast: 120, base: 200, moderate: 320 } as const;

/** Extra bottom padding a scrolling screen needs so the tab bar and the Sol button never cover content. */
export const bottomInset = size.tabBar + size.fab + space.lg;
