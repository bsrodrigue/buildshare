import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onChangePhoneNumber: (text: string) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export const PhoneInput = React.memo<PhoneInputProps>(
  ({ countryCode, phoneNumber, onChangePhoneNumber, label, disabled, error }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const hasLabel = !!label;

    // Strip country code from display value if present
    const displayValue = phoneNumber.startsWith(countryCode)
      ? phoneNumber.slice(countryCode.length)
      : phoneNumber;

    const handleChangeText = (text: string) => {
      // Allow only numbers
      const cleaned = text.replace(/[^0-9]/g, '');
      // Always prepend country code for the parent component
      onChangePhoneNumber(`${countryCode}${cleaned}`);
    };

    return (
      <View style={styles.container}>
        {hasLabel && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
        <View style={styles.phoneContainer}>
          <View style={[styles.countryCodeContainer, !!error && styles.inputError]}>
            <Text style={styles.flag}>🇧🇫</Text>
            <Text style={styles.countryCode}>{countryCode}</Text>
          </View>
          <View style={[styles.phoneInputWrapper, !!error && styles.inputError]}>
            <TextInput
              style={styles.phoneInput}
              placeholder="Numéro de téléphone"
              placeholderTextColor={theme.colors.placeholder}
              selectionColor={theme.colors.primary}
              value={displayValue}
              onChangeText={handleChangeText}
              keyboardType="phone-pad"
              editable={!disabled}
              autoComplete="tel"
              accessibilityLabel="Phone number"
            />
          </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

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
    phoneContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    countryCodeContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.none,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: 100,
      height: 48,
    },
    flag: {
      fontSize: 20,
    },
    countryCode: {
      fontSize: theme.fontSize.md,
      color: theme.colors.inputText,
      fontWeight: theme.fontWeight.medium,
    },
    phoneInputWrapper: {
      flex: 1,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.none,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      height: 48,
      justifyContent: 'center',
    },
    phoneInput: {
      fontSize: theme.fontSize.md,
      color: theme.colors.inputText,
      padding: 0,
      height: 28,
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
