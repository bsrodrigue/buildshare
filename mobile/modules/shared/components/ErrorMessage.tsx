import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface ErrorMessageProps {
  message: string | null | undefined;
}

export const ErrorMessage = React.memo<ErrorMessageProps>(({ message }) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor:
        theme.colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.08)',
      borderRadius: theme.borderRadius.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor:
        theme.colorScheme === 'dark' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.2)',
    },
    text: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.error,
    },
  });
