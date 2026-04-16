import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  placeholder: string;
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
  error?: string;
}

export const PasswordInput = React.memo<PasswordInputProps>(
  ({ placeholder, label, value, onChangeText, disabled, error, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const hasLabel = !!label;

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.inputWrapper,
            hasLabel && styles.inputWrapperWithLabel,
            !!error && styles.inputError,
          ]}
        >
          {hasLabel && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, hasLabel && styles.inputWithLabel]}
              placeholder={hasLabel ? undefined : placeholder}
              placeholderTextColor={theme.colors.placeholder}
              selectionColor={theme.colors.primary}
              value={value}
              onChangeText={onChangeText}
              editable={!disabled}
              secureTextEntry={!showPassword}
              {...props}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              {showPassword ? (
                <Ionicons name="eye" size={20} color={theme.colors.textSecondary} />
              ) : (
                <Ionicons name="eye-off" size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    inputWrapper: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.none,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      height: 48,
      justifyContent: 'center',
    },
    inputWrapperWithLabel: {
      height: 56,
      paddingTop: 6,
    },
    label: {
      fontSize: 11,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    labelError: {
      color: theme.colors.error,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.inputText,
      padding: 0,
      height: 28,
    },
    inputWithLabel: {
      height: 24,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    eyeIcon: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 32,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
  });
