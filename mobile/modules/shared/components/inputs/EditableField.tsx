import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface EditableFieldProps {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: string;
}

export const EditableField = ({ label, value, onPress }: EditableFieldProps) => {
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
          <Text style={styles.valueText}>{value}</Text>
        ) : (
          <Text style={styles.placeholderText}>Ajouter {label.toLowerCase()}</Text>
        )}
      </View>
      {onPress && <Ionicons name="create-outline" size={16} color={theme.colors.accent} />}
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
      paddingVertical: theme.spacing.xs,
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
      fontWeight: '500',
    },
    placeholderText: {
      color: theme.colors.placeholder,
      fontSize: theme.fontSize.sm,
      fontStyle: 'italic',
    },
  });
