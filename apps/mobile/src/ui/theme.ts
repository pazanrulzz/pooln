import type { TextStyle } from 'react-native';

/** iOS system palette (light appearance) plus Pooln's brand accent. */
export const colors = {
  brand: '#4F5BD5',
  brandDark: '#3A44B0',
  brandTint: '#ECEEFC',

  positive: '#1F9D55',
  positiveTint: '#E6F6EC',
  negative: '#E5484D',
  negativeTint: '#FDECEC',
  warning: '#F5A524',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7FA',
  fill: 'rgba(118,118,128,0.12)',
  fillStrong: 'rgba(118,118,128,0.2)',

  label: '#0B0B0F',
  secondaryLabel: 'rgba(60,60,67,0.64)',
  tertiaryLabel: 'rgba(60,60,67,0.36)',
  separator: 'rgba(60,60,67,0.14)',
  onBrand: '#FFFFFF',
} as const;

export const gradients = {
  brand: ['#5B67E8', '#7B5CE0', '#9A5AD8'] as const,
  positive: ['#23A55A', '#2BB673'] as const,
  negative: ['#E5484D', '#F06A5B'] as const,
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const shadow = {
  card: '0px 1px 2px rgba(16,24,40,0.04), 0px 4px 14px rgba(16,24,40,0.06)',
  raised: '0px 8px 30px rgba(16,24,40,0.12)',
  button: '0px 6px 16px rgba(79,91,213,0.28)',
} as const;

/** Apple's Dynamic Type scale at the default ("Large") size. */
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
export type ColorName = keyof typeof colors;
