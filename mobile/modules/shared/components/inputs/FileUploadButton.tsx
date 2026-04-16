import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface FileUploadButtonProps {
  onPress: () => void;
  hasFile: boolean;
  placeholder: string;
  uploadedText: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export const FileUploadButton = React.memo<FileUploadButtonProps>(
  ({ onPress, hasFile, placeholder, uploadedText, label, disabled, loading, error }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container}>
        {!!label && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
        <TouchableOpacity
          style={[styles.fileInput, !!error && styles.fileInputError]}
          onPress={onPress}
          disabled={disabled || loading}
          accessibilityRole="button"
          accessibilityLabel={placeholder}
          accessibilityHint="Tap to upload file"
        >
          <Text style={[styles.fileInputText, hasFile && styles.fileInputTextActive]}>
            {hasFile ? uploadedText : placeholder}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="attach" size={20} color={theme.colors.textSecondary} />
          )}
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

FileUploadButton.displayName = 'FileUploadButton';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: 11,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.xs,
    },
    labelError: {
      color: theme.colors.error,
    },
    fileInput: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.none,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      height: 48,
    },
    fileInputError: {
      borderColor: theme.colors.error,
    },
    fileInputText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.placeholder,
    },
    fileInputTextActive: {
      color: theme.colors.inputText,
    },
    attachIcon: {
      fontSize: 20,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
  });
