import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface NumberInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const NumberInput = ({ value, onChangeText }: NumberInputProps) => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleIncrement = () => {
    const num = parseInt(value || '0');
    onChangeText((num + 1).toString().padStart(2, '0'));
  };

  const handleDecrement = () => {
    const num = parseInt(value || '0');
    if (num > 0) {
      onChangeText((num - 1).toString().padStart(2, '0'));
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleDecrement} activeOpacity={0.6}>
        <Ionicons name="remove-circle-outline" size={22} color={theme.colors.accent} />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        textAlign="center"
        editable={true}
        maxLength={5}
      />

      <TouchableOpacity style={styles.button} onPress={handleIncrement} activeOpacity={0.6}>
        <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
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
      borderRadius: theme.borderRadius.sm,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
      padding: 0,
      height: '100%',
      letterSpacing: 1,
    },
    button: {
      width: 44,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
