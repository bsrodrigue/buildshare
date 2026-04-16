import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: 'small' | 'medium';
}

export const QuantitySelector = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max,
  size = 'medium',
}: QuantitySelectorProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isSmall = size === 'small';

  const canDecrease = quantity > min;
  const canIncrease = max === undefined || quantity < max;

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <TouchableOpacity
        style={[
          styles.button,
          isSmall && styles.buttonSmall,
          !canDecrease && styles.buttonDisabled,
        ]}
        onPress={onDecrease}
        disabled={!canDecrease}
        activeOpacity={0.7}
      >
        <Ionicons
          name="remove"
          size={isSmall ? 14 : 18}
          color={canDecrease ? theme.colors.accent : theme.colors.disabled}
        />
      </TouchableOpacity>

      <View style={[styles.valueWrapper, isSmall && styles.valueWrapperSmall]}>
        <Text style={[styles.valueText, isSmall && styles.valueTextSmall]}>{quantity}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          styles.increaseButton,
          isSmall && styles.buttonSmall,
          !canIncrease && styles.buttonDisabled,
        ]}
        onPress={onIncrease}
        disabled={!canIncrease}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={isSmall ? 14 : 18} color={theme.colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 25,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    containerSmall: {
      borderRadius: 20,
      padding: 2,
    },
    button: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colorScheme === 'dark' ? '#fff' : theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    increaseButton: {
      backgroundColor: theme.colors.accent,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.cardBackground,
      shadowOpacity: 0,
      elevation: 0,
      opacity: 0.5,
    },
    valueWrapper: {
      minWidth: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valueWrapperSmall: {
      minWidth: 22,
    },
    valueText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
    },
    valueTextSmall: {
      fontSize: 13,
    },
  });
