import { useMemo } from 'react';

import type { Theme } from './theme-core';
import { useTheme } from './ThemeProvider';

/**
 * Hook that creates memoized styles from a factory function.
 *
 * Styles are recomputed only when the theme changes (e.g. dark ↔ light).
 *
 * @example
 * ```tsx
 * function MyScreen() {
 *   const styles = useThemedStyles(createStyles);
 *   return <View style={styles.container} />;
 * }
 *
 * const createStyles = (theme: Theme) =>
 *   StyleSheet.create({
 *     container: { backgroundColor: theme.colors.background },
 *   });
 * ```
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(theme), [theme]);
}
