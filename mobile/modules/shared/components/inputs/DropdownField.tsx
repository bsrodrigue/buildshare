import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface DropdownFieldProps {
  label: string;
  value?: string;
  onPress?: () => void;
  labelColor?: string;
}

export const DropdownField = ({ label, value, onPress, labelColor }: DropdownFieldProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.textContainer}>
        <Text style={styles.labelText}>{label}</Text>
        {value ? (
          <Text style={[styles.valueText, labelColor ? { color: labelColor } : undefined]}>
            {value}
          </Text>
        ) : (
          <Text style={[styles.placeholderText, labelColor ? { color: labelColor } : undefined]}>
            Choisir une option
          </Text>
        )}
      </View>
      <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      borderRadius: theme.borderRadius.sm,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    textContainer: {
      flex: 1,
    },
    labelText: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
      marginBottom: 4,
      letterSpacing: 0.5,
    },
    valueText: {
      color: theme.colors.text,
      fontSize: theme.fontSize.sm,
      fontWeight: 'bold',
    },
    placeholderText: {
      color: theme.colors.placeholder,
      fontSize: theme.fontSize.sm,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
  });
