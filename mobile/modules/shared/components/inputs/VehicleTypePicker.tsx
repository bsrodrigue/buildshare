import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

export type VehicleType = 'moto' | 'velo' | 'voiture';

interface VehicleTypePickerProps {
  name: string;
  label?: string;
  value: VehicleType | undefined;
  onValueChange: (value: VehicleType | undefined) => void;
  disabled?: boolean;
  error?: string;
}

export const VehicleTypePicker = React.memo<VehicleTypePickerProps>(
  ({ value, label, onValueChange, disabled, error }) => {
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const hasLabel = !!label;

    return (
      <View style={styles.container}>
        {hasLabel && <Text style={[styles.label, !!error && styles.labelError]}>{label}</Text>}
        <View style={[styles.pickerContainer, !!error && styles.pickerError]}>
          <Picker
            selectedValue={value || ''}
            onValueChange={(vehicleType) => {
              onValueChange((vehicleType as VehicleType) || undefined);
            }}
            style={styles.picker}
            enabled={!disabled}
            accessibilityLabel="Select vehicle type"
            dropdownIconColor={theme.colors.inputText}
          >
            <Picker.Item label="Type de véhicule" value="" color={theme.colors.inputText} />
            <Picker.Item label="Moto" value="moto" color={theme.colors.inputText} />
            <Picker.Item label="Vélo" value="velo" color={theme.colors.inputText} />
            <Picker.Item label="Voiture" value="voiture" color={theme.colors.inputText} />
          </Picker>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

VehicleTypePicker.displayName = 'VehicleTypePicker';

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
