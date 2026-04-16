import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UserRole } from '@/modules/auth/api/schemas';
import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface RolePickerProps {
  name: string;
  label?: string;
  value: UserRole;
  onValueChange: (value: UserRole) => void;
  disabled?: boolean;
  error?: string;
}

export const RolePicker = React.memo<RolePickerProps>(
  ({ value, label, onValueChange, disabled, error }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    return (
      <View style={styles.container}>
        {!!label && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
        <View style={[styles.pickerContainer, !!error && styles.pickerError]}>
          <Picker
            selectedValue={value}
            onValueChange={(role) => {
              onValueChange(role);
            }}
            style={styles.picker}
            enabled={!disabled}
            accessibilityLabel="Select role"
            dropdownIconColor={theme.colors.inputText}
          >
            <Picker.Item
              label="Sélectionner un rôle"
              value={'client'}
              color={theme.colors.inputText}
            />
            <Picker.Item label="Livreur" value={'delivery_man'} color={theme.colors.inputText} />
            <Picker.Item label="Boutique" value={'seller'} color={theme.colors.inputText} />
            <Picker.Item label="Client" value={'client'} color={theme.colors.inputText} />
          </Picker>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

RolePicker.displayName = 'RolePicker';

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
    pickerContainer: {
      backgroundColor: theme.colors.inputBackground,
      borderRadius: theme.borderRadius.none,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      height: 48,
      justifyContent: 'center',
    },
    pickerError: {
      borderColor: theme.colors.error,
    },
    picker: {
      color: theme.colors.inputText,
      fontSize: theme.fontSize.md,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: theme.fontSize.xs,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.xs,
    },
  });
