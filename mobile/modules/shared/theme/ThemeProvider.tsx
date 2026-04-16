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
          secondary: baseTheme.colors.accent,
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
