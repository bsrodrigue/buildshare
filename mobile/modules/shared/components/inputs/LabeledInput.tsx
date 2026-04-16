import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface LabeledInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
}

export const LabeledInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
}: LabeledInputProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      color: theme.colors.accent, // Orange color for label
      fontSize: theme.fontSize.sm,
      fontWeight: 'bold',
      marginBottom: theme.spacing.xs,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 8,
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
