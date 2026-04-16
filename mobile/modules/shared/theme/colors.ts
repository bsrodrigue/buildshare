/**
 * Color palettes for light and dark modes.
 *
 * Semantic color names (e.g., `background`, `text`, `surface`) stay the same
 * across modes — only their values change. This lets components use
 * `colors.background` without knowing which mode is active.
 */

/**
 * Appends an alpha channel to a 6-digit hex color.
 * @param color  Hex color string, e.g. '#34C759'
 * @param alpha  Opacity from 0 (transparent) to 1 (opaque)
 * @returns 8-digit hex color, e.g. '#34C75980'
 */
export const toAlpha = (color: string, alpha: number): string => {
  const hex = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${color}${hex}`;
};

export const palette = {
  // Brand (shared across modes)
  lightBlue: '#00AEEF',
  orange: '#ff6b4a',
  red: '#FF3B30',
  green: '#34C759',
  white: '#ffffff',
  black: '#000000',
  splashBlue: '#4FA4F4',
  googleBlue: '#4285F4',
  transparent: 'transparent',
  whatsapp: '#25D366',
  amber: '#f59e0b',
  amber900: '#92400e',

  // Greens
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  green300: '#86efac',
  green400: '#4ade80',
  green500: '#34C759',
  green600: '#16a34a',
  green700: '#15803d',
  green800: '#166534',
  green900: '#14532d',

  // Reds
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red300: '#fca5a5',
  red400: '#f87171',
  red500: '#FF3B30',
  red600: '#dc2626',
  red700: '#b91c1c',
  red800: '#991b1b',
  red900: '#7f1d1d',

  // Oranges
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange200: '#fed7aa',
  orange300: '#fdba74',
  orange400: '#fb923c',
  orange500: '#ff6b4a',
  orange600: '#ea580c',
  orange700: '#c2410c',
  orange800: '#9a3412',
  orange900: '#7c2d12',

  // Blues
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue300: '#93c5fd',
  blue400: '#60a5fa',
  blue500: '#00bfff',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  blue900: '#1e3a8a',
  purple600: '#9333ea',

  // Dark mode surfaces
  darkBlue: '#10131f',
  darkSurface: '#1a1d2e',
  darkCard: '#1e2135',

  // Light mode surfaces
  lightBackground: '#f8f9fb',
  lightSurface: '#ffffff',
  lightCard: '#ffffff',

  // Grays
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#d3d3d3',
  gray300: '#ccc',
  gray400: '#999',
  gray500: '#666',
  gray600: '#555',
  gray700: '#444',
  gray800: '#333',
  gray900: '#1a1a1a',
};

export type ThemeColors = typeof darkColors;

export const darkColors = {
  // Backgrounds
  background: palette.darkBlue,
  surface: 'rgba(255,255,255,0.08)',
  inputBackground: palette.lightBackground,
  cardBackground: 'rgba(255,255,255,0.05)',

  // Text
  text: palette.white,
  textBlack: palette.black,
  inputText: palette.gray900,
  textSecondary: palette.gray500,
  textOnPrimary: palette.white,
  placeholder: palette.gray400,

  // Brand
  primary: palette.lightBlue,
  accent: palette.orange,
  splashBackground: palette.splashBlue,

  // Feedback
  error: palette.red,
  success: palette.green,
  disabled: palette.gray500,

  // UI Elements
  border: palette.gray500,
  otpBox: palette.white,
  otpBoxActive: palette.white,

  // Kept for backward compat (prefer semantic names above)
  whiteBackground: palette.white,
  textWhite: palette.white,
  textLight: palette.gray300,
  transparent: palette.transparent,
  whatsapp: palette.whatsapp,
  amber: palette.amber,
  amber900: palette.amber900,
  blue900: palette.blue900,
  red600: palette.red600,
  statusDelivered: palette.green600,
  statusCancelled: palette.red600,
  statusDelivery: palette.blue600,
  statusPreparing: palette.orange600,
  statusPendingConfirmation: palette.purple600,
  shadow: palette.black,
  overlay: 'rgba(0,0,0,0.6)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha70: 'rgba(255,255,255,0.7)',
  whiteAlpha96: 'rgba(255,255,255,0.96)',
  googleBlue: palette.googleBlue,
  skeleton: 'rgba(255,255,255,0.1)',
};

export const lightColors: ThemeColors = {
  // Backgrounds
  background: palette.lightBackground,
  surface: palette.lightSurface,
  inputBackground: palette.gray100,
  cardBackground: palette.lightCard,

  // Text
  text: palette.black,
  textBlack: palette.black,
  inputText: palette.gray900,
  textSecondary: palette.gray600,
  textOnPrimary: palette.white,
  placeholder: palette.gray400,

  // Brand
  primary: palette.lightBlue,
  accent: palette.orange,
  splashBackground: palette.splashBlue,

  // Feedback
  error: palette.red,
  success: palette.green,
  disabled: palette.gray400,

  // UI Elements
  border: 'rgba(0,0,0,0.08)',
  otpBox: '#E0E0E0',
  otpBoxActive: palette.gray800,

  // Backward compat names
  whiteBackground: palette.white,
  textWhite: palette.gray900, // in light mode, "textWhite" means "primary text"
  textLight: palette.gray600,
  transparent: palette.transparent,
  whatsapp: palette.whatsapp,
  amber: palette.amber,
  amber900: palette.amber900,
  blue900: palette.blue900,
  red600: palette.red600,
  statusDelivered: palette.green600,
  statusCancelled: palette.red600,
  statusDelivery: palette.blue600,
  statusPreparing: palette.orange600,
  statusPendingConfirmation: palette.purple600,
  shadow: palette.black,
  overlay: 'rgba(0,0,0,0.6)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha70: 'rgba(255,255,255,0.7)',
  googleBlue: palette.googleBlue,
  whiteAlpha96: 'rgba(255,255,255,0.96)',
  skeleton: '#E0E0E0',
};
