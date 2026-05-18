export const palette = {
  background: '#fcf9f8',
  surface: '#ffffff',
  surfaceMuted: '#f6f3f2',
  surfaceStrong: '#f0eded',
  text: '#1b1c1c',
  textMuted: '#5f5e5b',
  textSoft: '#747878',
  border: 'rgba(27, 28, 28, 0.12)',
  borderStrong: 'rgba(27, 28, 28, 0.2)',
  accent: '#6a1f2a',
  accentSoft: '#f3e4e7',
  success: '#2e4d31',
  successSoft: '#e6efe7',
  warning: '#8e0f28',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: 34,
  title: 28,
  heading: 22,
  body: 16,
  bodySmall: 14,
  label: 12,
} as const;
