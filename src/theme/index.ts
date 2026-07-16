/**
 * Design tokens. Mirrors design.json v2 (Vinyl.dc) — that file is the source of truth.
 * Never hardcode hex values in components; import from here.
 */

export const palette = {
  cerulean: '#227C9D',
  tiffany: '#17C3B2',
  sunset: '#FFCB77',
  floralWhite: '#FEF9EF',
  coral: '#FE6D73',
  // derived (design.json > palette.derived)
  ink: '#1C2B33',
  inkSoft: '#42474B',
  muted: '#5C6A72',
  muted2: '#8A95A0',
  muted3: '#9AA0A6',
  iconIdle: '#A7B1B9',
  navIdle: '#B3BCC3',
  iconFaint: '#C3CCD2',
  sunsetText: '#C9873A',
  hairline: '#F0EADF',
  progressTrack: '#D9D5CD',
  white: '#FFFFFF',
} as const;

/** Skeuomorphic turntable device colors (design.json > palette.device) */
export const device = {
  bodyLight: '#FEFEFE',
  bodyMid: '#F6F6F6',
  bodyDark: '#ECECEC',
  panelTop: '#2A2A2A',
  panelBottom: '#0E0E0E',
  ledPanelTop: '#141414',
  ledPanelBottom: '#070707',
  keycapTop: '#DCDCDC',
  keycapBottom: '#C5C5C5',
  keycapDarkTop: '#CFCFCF',
  keycapDarkBottom: '#BCBCBC',
  keycapIcon: '#3A3A3A',
  keycapIconSoft: '#5A5A5A',
  keycapBar: '#8F8F8F',
  ledOff: '#2B2B2B',
  // device accent — mock default 'Coral' (alternates: Ice blue #CDE6FF/156,203,255, Teal #7FF0E4/23,195,178)
  displayAccent: '#FFB3B6',
  displayGlowRgb: '254,109,115',
  vinylOuter: '#242428',
  vinylMid: '#131315',
  vinylDeep: '#0A0A0C',
  vinylEdge: '#050506',
  hubLight: '#2C2C30',
  hubMid: '#161618',
  hubDark: '#0E0E10',
  spindle: '#DAD7D0',
} as const;

export const gradients = {
  coverSet: [
    ['#FE6D73', '#FFCB77'],
    ['#227C9D', '#17C3B2'],
    ['#17C3B2', '#FFCB77'],
    ['#227C9D', '#FE6D73'],
    ['#FFCB77', '#FE6D73'],
    ['#17C3B2', '#227C9D'],
    ['#FFCB77', '#17C3B2'],
    ['#FE6D73', '#227C9D'],
  ],
  statTeal: ['#227C9D', '#17C3B2'],
  statWarm: ['#FFCB77', '#FE6D73'],
  profileHeader: ['#227C9D', '#17C3B2'],
  avatar: ['#FFCB77', '#FE6D73'],
  onboarding: ['#227C9D', '#17C3B2', '#12A99A'],
  connectCard: ['#FFCB77', '#FE6D73'],
  progressFill: ['#3B4046', '#5C636B'],
  nowPlayingBg: ['#FFFFFF', '#F4F2EE', '#EAE6DF'],
} as const;

/** Pick a deterministic cover gradient for a track id. */
export function coverGradient(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const set = gradients.coverSet[Math.abs(hash) % gradients.coverSet.length];
  return (set ?? gradients.coverSet[0]) as readonly [string, string];
}

/** Font family names as registered by expo-google-fonts loaders. */
export const font = {
  display: 'Sora_800ExtraBold',
  displayBold: 'Sora_700Bold',
  body: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_600SemiBold',
  /** custom display face (user-provided YangBagus) — Visual song title */
  bubbly: 'YangBagus',
  /** oversized display type — You-screen hero name, behind the Earth. Heaviest
   *  weight of a spec-preferred geometric sans (Manrope_800ExtraBold is the
   *  heaviest bundled weight; the design spec's "900" is a target, not a hard font-file requirement). */
  hero: 'Manrope_800ExtraBold',
} as const;

export const type = {
  screenTitle: { fontFamily: font.display, fontSize: 30, color: palette.ink, letterSpacing: -0.6 } as const,
  nowPlayingTitle: { fontFamily: font.display, fontSize: 26, color: palette.ink, letterSpacing: -0.5 } as const,
  kicker: { fontFamily: font.mono, fontSize: 10, letterSpacing: 3.4, color: palette.muted3 } as const,
  sectionKicker: { fontFamily: font.bodyExtraBold, fontSize: 11, letterSpacing: 2.2 } as const,
  artist: { fontFamily: font.bodySemi, fontSize: 14, color: palette.muted } as const,
  listTitle: { fontFamily: font.bodyBold, fontSize: 15, color: palette.ink } as const,
  listSub: { fontFamily: font.bodySemi, fontSize: 12.5, color: palette.muted2 } as const,
  timestamp: { fontFamily: font.mono, fontSize: 11, letterSpacing: 0.55, color: palette.muted3 } as const,
  navLabel: { fontFamily: font.bodyExtraBold, fontSize: 9 } as const,
  statNumber: { fontFamily: font.display, fontSize: 22 } as const,
  settingTitle: { fontFamily: font.bodyBold, fontSize: 15, color: palette.ink } as const,
  settingSub: { fontFamily: font.bodySemi, fontSize: 12, color: palette.muted2 } as const,
} as const;

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  screen: 24,
  /** bottom padding for scrollables so content clears the floating nav */
  navClearance: 120,
} as const;

export const radius = {
  iconButton: 14,
  card: 18,
  cardLarge: 20,
  cover: 13,
  playlist: 22,
  nav: 26,
  device: 20,
  keycap: 9,
  pill: 999,
} as const;

/** Soft ink-tinted shadows (design.json > layout.shadows). iOS-first; Android stays flat. */
export const shadows = {
  iconButton: {
    shadowColor: '#1E2832',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    shadowColor: '#1E2832',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  cover: {
    shadowColor: '#1E2832',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  playlistCard: {
    shadowColor: '#1E2832',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  nav: {
    shadowColor: '#1E2832',
    shadowOpacity: 0.18,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
  },
  /** light source top-right: device shadows fall bottom-left */
  deviceBody: {
    shadowColor: '#1C212A',
    shadowOpacity: 0.32,
    shadowRadius: 60,
    shadowOffset: { width: -26, height: 32 },
  },
  vinyl: {
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: -24, height: 26 },
  },
} as const;

export const motion = {
  /** vinyl spin target while playing, degrees per second */
  vinylDegPerSec: 60,
  /** per-frame easing factors from the mock's rAF loop (frame-rate normalized in worklet) */
  vinylSpinUpFactor: 0.06,
  vinylSpinDownFactor: 0.08,
  /** one full drag revolution scrubs this many seconds of audio */
  scrubSecondsPerRev: 8,
  ledFlickerMs: 110,
  overlayMs: 420,
} as const;

export const hitTarget = { minSize: 44 } as const;

/** Screen-level theme colors (design.json v3 > darkMode). Accents (coral /
 *  tiffany / cerulean / sunset) are shared — they read well on both grounds. */
export interface ThemeColors {
  bg: string;
  /** subtle vertical gradient behind Now Playing */
  bgGradient: readonly [string, string, string];
  surface: string;
  text: string;
  textMuted: string;
  textFaint: string;
  hairline: string;
  navBg: string;
  navBorder: string;
  navIdle: string;
  inputBg: string;
  progressTrack: string;
  profileGradient: readonly [string, string];
  statusBar: 'light' | 'dark';
}

export const themes: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: palette.floralWhite,
    bgGradient: ['#FFFFFF', '#F4F2EE', '#EAE6DF'],
    surface: palette.white,
    text: palette.ink,
    textMuted: palette.muted,
    textFaint: palette.muted2,
    hairline: palette.hairline,
    navBg: 'rgba(255,255,255,0.92)',
    navBorder: palette.white,
    navIdle: palette.navIdle,
    inputBg: palette.white,
    progressTrack: palette.progressTrack,
    profileGradient: ['#EDF5FB', '#E5EEF6'],
    statusBar: 'dark',
  },
  dark: {
    bg: '#000000',
    bgGradient: ['#17191C', '#0A0B0D', '#000000'],
    surface: '#141619',
    text: '#F4F1EA',
    textMuted: '#A8B0B7',
    textFaint: '#6E777E',
    hairline: '#22262A',
    navBg: 'rgba(16,18,20,0.94)',
    navBorder: '#1E2226',
    navIdle: '#5C646B',
    inputBg: '#141619',
    progressTrack: '#2A2E33',
    profileGradient: ['#0B0E14', '#000000'],
    statusBar: 'light',
  },
};
