import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { Logger } from '@/libs/log';

import { buildTheme, type ColorScheme, type Theme } from './theme-core';

const logger = new Logger('ThemeProvider');

// =============================================================================
// React Context
// =============================================================================

const ThemeContext = createContext<Theme>(buildTheme('dark'));

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a specific mode. If omitted, follows the system setting. */
  forcedColorScheme?: ColorScheme;
}

export function ThemeProvider({
  children,
  forcedColorScheme: _forcedColorScheme,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  // const colorScheme: ColorScheme =
  //   forcedColorScheme ?? (systemScheme === 'light' ? 'light' : 'dark');

  const colorScheme: ColorScheme = 'dark';

  logger.info(`System scheme: ${systemScheme}, Color scheme: ${colorScheme}`);

  const themeValue = useMemo(() => buildTheme(colorScheme), [colorScheme]);

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the current theme reactively.
 *
 * Use this in components that need to respond to dark/light mode changes.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
