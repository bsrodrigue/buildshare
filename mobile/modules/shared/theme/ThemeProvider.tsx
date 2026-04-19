import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { Logger } from '@/libs/log';

import { buildTheme, type ColorScheme, type Theme } from './theme-core';

const logger = new Logger('ThemeProvider');

// =============================================================================
// React Context
// =============================================================================

export interface ThemeWithPaper extends Theme {
  paperTheme: MD3Theme;
}

const ThemeContext = createContext<ThemeWithPaper>({
  ...buildTheme('dark'),
  paperTheme: MD3DarkTheme,
});

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a specific mode. If omitted, follows the system setting. */
  forcedColorScheme?: ColorScheme;
}

export function ThemeProvider({
  children,
  forcedColorScheme,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const colorScheme: ColorScheme =
    forcedColorScheme ?? (systemScheme === 'light' ? 'light' : 'dark');


  logger.info(`System scheme: ${systemScheme}, Color scheme: ${colorScheme}`);

  const themeValue = useMemo((): ThemeWithPaper => {
    const baseTheme = buildTheme(colorScheme);
    const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

    return {
      ...baseTheme,
      paperTheme: {
        ...paperTheme,
        colors: {
          ...paperTheme.colors,
          primary: baseTheme.colors.primary,
          onPrimary: baseTheme.colors.onPrimary,
          primaryContainer: baseTheme.colors.primaryContainer,
          onPrimaryContainer: baseTheme.colors.onPrimaryContainer,
          
          secondary: baseTheme.colors.accent,
          onSecondary: baseTheme.colors.onSecondary,
          secondaryContainer: baseTheme.colors.secondaryContainer,
          onSecondaryContainer: baseTheme.colors.onSecondaryContainer,
          
          tertiary: baseTheme.colors.tertiaryContainer,
          onTertiary: baseTheme.colors.onTertiaryContainer,
          tertiaryContainer: baseTheme.colors.tertiaryContainer,
          onTertiaryContainer: baseTheme.colors.onTertiaryContainer,
          
          surface: baseTheme.colors.surface,
          onSurface: baseTheme.colors.onSurface,
          surfaceVariant: baseTheme.colors.surfaceVariant,
          onSurfaceVariant: baseTheme.colors.onSurfaceVariant,
          
          outline: baseTheme.colors.outline,
          error: baseTheme.colors.error,
        },
      },
    };
  }, [colorScheme]);

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the current theme reactively.
 *
 * Use this in components that need to respond to dark/light mode changes.
 */
export function useTheme(): ThemeWithPaper {
  return useContext(ThemeContext);
}
