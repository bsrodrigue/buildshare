import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface InputProps extends TextInputProps {
  placeholder: string;
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  disabled?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = React.memo<InputProps>(
  ({
    placeholder,
    label,
    value,
    onChangeText,
    disabled,
    error,
    style,
    containerStyle,
    ...props
  }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const hasLabel = !!label;

    return (
      <View style={[styles.container, containerStyle]}>
        <View
          style={[
            styles.inputWrapper,
            hasLabel && styles.inputWrapperWithLabel,
            !!error && styles.inputError,
          ]}
        >
          {hasLabel && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
          <TextInput
            style={[styles.input, hasLabel && styles.inputWithLabel, style]}
            placeholder={hasLabel ? undefined : placeholder}
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.primary}
            value={value}
            onChangeText={onChangeText}
            editable={!disabled}
            {...props}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';

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
    input: {
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
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
  });
