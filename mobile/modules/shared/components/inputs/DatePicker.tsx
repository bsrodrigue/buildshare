import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNDatePicker from 'react-native-date-picker';

import { DateTimeService } from '@/libs/datetime';
import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

export const DatePicker = ({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
  disabled,
  placeholder = 'Sélectionner une date',
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasLabel = !!label;

  const handleConfirm = (date: Date) => {
    setOpen(false);
    onChange(date);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.inputWrapper,
          hasLabel && styles.inputWrapperWithLabel,
          !!error && styles.inputError,
          disabled && styles.disabled,
        ]}
        onPress={() => setOpen(true)}
        disabled={disabled}
      >
        <View style={styles.inputContent}>
          <View style={styles.textContent}>
            {hasLabel && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
            <Text style={[styles.valueText, !value && styles.placeholderText]}>
              {value ? DateTimeService.format(value, 'DD/MM/YYYY') : placeholder}
            </Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <RNDatePicker
        modal
        open={open}
        date={value || new Date()}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        confirmText="Confirmer"
        cancelText="Annuler"
        title="Sélectionner une date"
        theme={theme.colorScheme === 'dark' ? 'dark' : 'light'}
        buttonColor={theme.colors.primary}
        dividerColor={theme.colors.primary}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    inputWrapper: {
      backgroundColor: theme.colors.inputBackground,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      height: 56,
      justifyContent: 'center',
    },
    inputWrapperWithLabel: {
      height: 60,
      paddingTop: 4,
    },
    inputContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    textContent: {
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: toAlpha(theme.colors.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },
    label: {
      fontSize: 10,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 2,
    },
    labelError: {
      color: theme.colors.error,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    disabled: {
      opacity: 0.5,
    },
    valueText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.inputText,
      fontWeight: '500',
    },
    placeholderText: {
      color: theme.colors.placeholder,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
  });
