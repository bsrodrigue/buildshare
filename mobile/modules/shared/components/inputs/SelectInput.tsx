import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { DimensionValue, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface SelectInputProps {
  label: string;
  value?: string;
  onPress?: () => void;
  width?: DimensionValue;
  style?: ViewStyle;
  textColor?: string;
}

export const SelectInput = ({
  label,
  value,
  onPress,
  width,
  style,
  textColor,
}: SelectInputProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.container, width ? { width } : styles.fullWidth, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, textColor ? { color: textColor } : null]} numberOfLines={1}>
        {value || label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={textColor || theme.colors.textOnPrimary} />
    </TouchableOpacity>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.xs,
    },
    fullWidth: {
      flex: 1,
    },
    label: {
      color: theme.colors.textOnPrimary,
      fontSize: theme.fontSize.sm,
      fontWeight: '600',
      marginRight: 4,
    },
  });
