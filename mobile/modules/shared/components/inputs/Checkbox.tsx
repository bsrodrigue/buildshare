import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string;
  linkText?: string;
  onLinkPress?: () => void;
  disabled?: boolean;
  error?: string;
}

export const Checkbox = React.memo<CheckboxProps>(
  ({ checked, onPress, label, linkText, onLinkPress, disabled, error }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          <View style={[styles.box, checked && styles.boxChecked]}>
            {checked && <Ionicons name="checkmark" size={14} color={theme.colors.textWhite} />}
          </View>
          <Text style={styles.checkboxLabel}>
            {label}{' '}
            {linkText && (
              <Text style={styles.linkText} onPress={onLinkPress} accessibilityRole="link">
                {linkText}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Checkbox.displayName = 'Checkbox';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    box: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 4,
      marginRight: 12,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    boxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxLabel: {
      flex: 1,
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    linkText: {
      color: theme.colors.primary,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xl,
    },
  });
