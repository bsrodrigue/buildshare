import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface SquaredPhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onChangePhoneNumber: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  flagColors?: { top: string; bottom: string };
}

export const SquaredPhoneInput = React.memo<SquaredPhoneInputProps>(
  ({
    countryCode,
    phoneNumber,
    onChangePhoneNumber,
    placeholder = 'Numéro de téléphone',
    disabled = false,
    error,
    flagColors = { top: 'red', bottom: 'green' },
  }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);

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
        <View style={styles.phoneRow}>
          <View style={[styles.prefixContainer, error && styles.prefixContainerError]}>
            <Text style={styles.prefixText}>Préfixe</Text>
            <View style={styles.flagRow}>
              <View style={styles.flag}>
                <View style={[styles.flagStripe, { backgroundColor: flagColors.top }]} />
                <View style={[styles.flagStripe, { backgroundColor: flagColors.bottom }]} />
              </View>
              <Text style={styles.countryCode}>{countryCode}</Text>
            </View>
          </View>
          <View style={[styles.phoneInputWrapper, error && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
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

SquaredPhoneInput.displayName = 'SquaredPhoneInput';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    phoneRow: {
      flexDirection: 'row',
    },
    prefixContainer: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.none,
      padding: 4,
      marginRight: theme.spacing.sm,
      width: 80,
      backgroundColor: theme.colors.inputBackground,
    },
    prefixContainerError: {
      borderColor: theme.colors.error,
    },
    prefixText: {
      fontSize: 8,
      color: theme.colors.placeholder,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    flagRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flag: {
      width: 16,
      height: 12,
      marginRight: 4,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
    },
    flagStripe: {
      flex: 1,
    },
    countryCode: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.colors.inputText,
    },
    phoneInputWrapper: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.none,
      paddingHorizontal: theme.spacing.sm,
      justifyContent: 'center',
      height: 48,
      backgroundColor: theme.colors.inputBackground,
    },
    input: {
      flex: 1,
      color: theme.colors.inputText,
      fontSize: theme.fontSize.sm,
      padding: 0,
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
