import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { Format } from '@/libs/fmt';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface PriceTextProps {
  amount: number;
  showCurrency?: boolean;
  style?: StyleProp<TextStyle>;
}

export const PriceText = ({ amount, showCurrency = true, style }: PriceTextProps) => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    text: {
      color: colors.accent,
      fontWeight: 'bold',
    },
  });

  return <Text style={[styles.text, style]}>{Format.price(amount, showCurrency)}</Text>;
};
