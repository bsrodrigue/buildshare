import { Logger } from '@/libs/log';

import { darkColors, lightColors, type ThemeColors } from './colors';

const logger = new Logger('ThemeCore');

// =============================================================================
// Theme shape
// =============================================================================

export type ColorScheme = 'light' | 'dark';

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 60,
} as const;

const size = {
  xs: 80,
  sm: 120,
  md: 200,
  lg: 240,
  xl: 320,
  xxl: 420,
} as const;

const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 30,
} as const;

const fontSize = {
  xs: 12,
  sm: 14,
  md: 15,
  base: 16,
  lg: 24,
  xl: 28,
  xxl: 48,
} as const;

const fontWeight = {
  normal: '400' as const,
  medium: '600' as const,
  bold: '700' as const,
};

const fontFamily = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  heading: 'System',
};

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  size: typeof size;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  fontFamily: typeof fontFamily;
  colorScheme: ColorScheme;
}

export function buildTheme(colorScheme: ColorScheme): Theme {
  logger.info(`Building theme for color scheme: ${colorScheme}`);

  return {
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    spacing,
    size,
    borderRadius,
    fontSize,
    fontWeight,
    fontFamily,
    colorScheme,
  };
}

/**
 * STATIC FALLBACK THEME
 * @deprecated Use useTheme() or useThemedStyles() instead.
 * Static usage breaks dark/light mode switching as it is initialized only once.
 */
export const FALLBACK_THEME = buildTheme('dark');

/**
 * @deprecated Use useTheme() or useThemedStyles() instead.
 * Static usage breaks dark/light mode switching as it is initialized only once.
 */
export const theme = FALLBACK_THEME;

/**
 * @deprecated Use getTypography(theme) inside components for reactive typography.
 */
export const typography = {
  h1: {
    fontSize: theme.fontSize.xxl,
    fontFamily: theme.fontFamily.heading,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  h2: {
    fontSize: theme.fontSize.xl,
    fontFamily: theme.fontFamily.heading,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textWhite,
  },
  h3: {
    fontSize: theme.fontSize.lg,
    fontFamily: theme.fontFamily.heading,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textWhite,
  },
  body: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fontFamily.regular,
    color: theme.colors.text,
  },
  bodySmall: {
    fontSize: theme.fontSize.sm,
    fontFamily: theme.fontFamily.regular,
    color: theme.colors.textLight,
  },
  button: {
    fontSize: theme.fontSize.base,
    fontFamily: theme.fontFamily.medium,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1,
  },
};

/**
 * Helper to build a typography object from a given theme.
 * Useful inside components that use useTheme() for reactive typography.
 */
export function getTypography(t: Theme) {
  return {
    h1: {
      fontSize: t.fontSize.xxl,
      fontFamily: t.fontFamily.heading,
      fontWeight: t.fontWeight.bold,
      color: t.colors.textWhite,
    },
    h2: {
      fontSize: t.fontSize.xl,
      fontFamily: t.fontFamily.heading,
      fontWeight: t.fontWeight.bold,
      color: t.colors.textWhite,
    },
    h3: {
      fontSize: t.fontSize.lg,
      fontFamily: t.fontFamily.heading,
      fontWeight: t.fontWeight.medium,
      color: t.colors.textWhite,
    },
    body: {
      fontSize: t.fontSize.base,
      fontFamily: t.fontFamily.regular,
      color: t.colors.text,
    },
    bodySmall: {
      fontSize: t.fontSize.sm,
      fontFamily: t.fontFamily.regular,
      color: t.colors.textSecondary,
    },
    button: {
      fontSize: t.fontSize.base,
      fontFamily: t.fontFamily.medium,
      fontWeight: t.fontWeight.bold,
      letterSpacing: 1,
    },
  };
}
