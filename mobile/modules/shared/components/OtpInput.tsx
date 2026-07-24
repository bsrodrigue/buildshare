import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputKeyPressEvent, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChangeText,
  onComplete,
  error = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const completedRef = useRef(false);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    }
    if (value.length !== length) {
      completedRef.current = false;
    }
  }, [value, length, onComplete]);

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyPress = useCallback(
    (e: TextInputKeyPressEvent) => {
      if (e.nativeEvent.key === 'Backspace' && value.length === 0) {
        return;
      }
    },
    [value.length],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
      onChangeText(cleaned);
    },
    [length, onChangeText],
  );

  const borderColor = error
    ? theme.colors.error
    : focused
      ? theme.colors.primary
      : theme.colors.outline;

  return (
    <>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={length}
        editable={!disabled}
        style={styles.hiddenInput}
      />
      <Pressable onPress={handlePress} style={styles.container}>
        {digits.map((digit, index) => {
          const isCurrent = focused && index === Math.min(value.length, length - 1);
          const isFilled = digit !== '';
          return (
            <View
              key={index}
              style={[
                styles.box,
                isFilled && styles.boxFilled,
                {
                  borderColor: isCurrent && !error ? theme.colors.primary : borderColor,
                },
                error && styles.boxError,
              ]}
            >
              <Text
                variant="headlineMedium"
                style={[styles.digit, disabled ? styles.digitDisabled : styles.digitActive]}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxError: {
    borderWidth: 2,
  },
  digit: {
    fontWeight: '700',
    letterSpacing: 0,
  },
  digitActive: {
    color: '#1C1B1F',
  },
  digitDisabled: {
    color: '#CAC4D0',
  },
  boxFilled: {
    backgroundColor: '#E7E0EC',
  },
});
