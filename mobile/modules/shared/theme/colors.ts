/**
 * Appends an alpha channel to a 6-digit hex color.
 */
export const toAlpha = (color: string, alpha: number): string => {
  const hex = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${color}${hex}`;
};

export const palette = {
  // Material 3 Seed / Baseline Colors
  primary: '#6750A4',
  primaryDark: '#D0BCFF',
  secondary: '#625B71',
  secondaryDark: '#CCC2DC',
  tertiary: '#7D5260',
  tertiaryDark: '#EFB8C8',
  error: '#B3261E',
  errorDark: '#F2B8B5',
  neutral: '#939094',
  neutralDark: '#939094',

  // Surfaces & Backgrounds
  lightBackground: '#FEF7FF',
  lightSurface: '#F7F2FA',
  lightSurfaceVariant: '#E7E0EC',
  darkBackground: '#141218',
  darkSurface: '#1D1B20',
  darkSurfaceVariant: '#49454F',

  // Text & Icons
  black: '#000000',
  white: '#FFFFFF',
  gray500: '#79747E',
  gray400: '#938F99',

  // Others
  transparent: 'transparent',
  whatsapp: '#25D366',
  googleBlue: '#4285F4',
};

export type ThemeColors = typeof darkColors;

export const darkColors = {
  // Backgrounds
  background: palette.darkBackground,
  surface: palette.darkSurface,
  inputBackground: palette.darkSurfaceVariant,
  cardBackground: palette.darkSurface,

  // Text
  text: '#E6E1E5',
  textBlack: palette.black,
  inputText: '#E6E1E5',
  textSecondary: palette.gray400,
  textOnPrimary: '#381E72',
  placeholder: palette.gray500,

  // Brand / MD3
  primary: palette.primaryDark,
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  
  accent: palette.secondaryDark,
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',
  
  surface: palette.darkSurface,
  onSurface: '#E6E1E5',
  surfaceVariant: palette.darkSurfaceVariant,
  onSurfaceVariant: '#CAC4D0',
  
  outline: '#938F99',
  splashBackground: palette.primaryDark,

  // Feedback
  error: palette.errorDark,
  success: '#B2EEB1',
  disabled: 'rgba(230, 225, 229, 0.38)',

  // UI Elements
  border: palette.darkSurfaceVariant,

  // Compat
  whiteBackground: palette.white,
  textWhite: palette.white,
  textLight: palette.gray400,
  transparent: palette.transparent,
  whatsapp: palette.whatsapp,
  amber: '#FFD600',
  amber900: '#FFAB00',
  blue900: '#0D47A1',
  red600: '#D32F2F',
  statusDelivered: '#4CAF50',
  statusCancelled: '#F44336',
  statusDelivery: '#2196F3',
  statusPreparing: '#FF9800',
  statusPendingConfirmation: '#9C27B0',
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
  inputBackground: palette.lightSurfaceVariant,
  cardBackground: palette.white,

  // Text
  text: '#1C1B1F',
  textBlack: palette.black,
  inputText: '#1C1B1F',
  textSecondary: palette.gray500,
  textOnPrimary: palette.white,
  placeholder: palette.gray400,

  // Brand / MD3
  primary: palette.primary,
  onPrimary: palette.white,
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  
  accent: palette.secondary,
  onSecondary: palette.white,
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',
  
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  
  surface: palette.lightSurface,
  onSurface: '#1C1B1F',
  surfaceVariant: palette.lightSurfaceVariant,
  onSurfaceVariant: '#49454F',
  
  outline: '#79747E',
  splashBackground: palette.primary,

  // Feedback
  error: palette.error,
  success: '#2E7D32',
  disabled: 'rgba(28, 27, 31, 0.38)',

  // UI Elements
  border: 'rgba(0,0,0,0.08)',
  // Compat
  whiteBackground: palette.white,
  textWhite: '#1C1B1F',
  textLight: palette.gray500,
  transparent: palette.transparent,
  whatsapp: palette.whatsapp,
  amber: '#FFD600',
  amber900: '#FFAB00',
  blue900: '#0D47A1',
  red600: '#D32F2F',
  statusDelivered: '#4CAF50',
  statusCancelled: '#F44336',
  statusDelivery: '#2196F3',
  statusPreparing: '#FF9800',
  statusPendingConfirmation: '#9C27B0',
  shadow: palette.black,
  overlay: 'rgba(0,0,0,0.4)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha70: 'rgba(255,255,255,0.7)',
  googleBlue: palette.googleBlue,
  whiteAlpha96: 'rgba(255,255,255,0.96)',
  skeleton: '#E0E0E0',
};
