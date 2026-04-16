import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export const OTPInput = React.memo<OTPInputProps>(({ length = 6, value, onChange, error }) => {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const styles = useThemedStyles(createStyles);
  const theme = useThemedStyles((t) => t);

  const boxes = Array(length).fill(0);

  React.useEffect(() => {
    // Focus automatically on mount
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 300); // Small delay to play well with screen transitions
    return () => clearTimeout(timeout);
  }, []);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const isSixDigit = length > 4;
  const boxSize = isSixDigit ? 45 : 60;
  const boxGap = isSixDigit ? theme.spacing.sm : theme.spacing.md;
  const digitFontSize = isSixDigit ? 24 : 32;

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* 
        The TextInput is placed ON TOP (zIndex: 1) but invisible (opacity: 0).
        This ensures it catches ALL touches and native keyboard events 
        without being blocked by the visual boxes.
      */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const numericValue = text.replace(/[^0-9]/g, '').slice(0, length);
          onChange(numericValue);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        style={styles.hiddenInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        caretHidden={true}
      />

      {/* Visible Boxes - pointerEvents="none" ensures touches pass through to the TextInput */}
      <View style={[styles.boxesContainer, { gap: boxGap }]} pointerEvents="none">
        {boxes.map((_, index) => {
          const digit = value[index];
          const isCurrent = index === value.length && isFocused;
          const isFilled = !!digit;

          return (
            <View
              key={index}
              style={[
                styles.box,
                { width: boxSize, height: boxSize },
                isFilled && styles.boxFilled,
                isCurrent && styles.boxActive,
                error && styles.boxError,
              ]}
            >
              <Text style={[styles.digit, { fontSize: digitFontSize }]}>{digit ? '*' : ''}</Text>
              {isCurrent && <View style={styles.cursor} />}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
});

OTPInput.displayName = 'OTPInput';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
      width: '100%',
      height: 60, // Ensure a consistent hit area
      justifyContent: 'center',
    },
    hiddenInput: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0,
      zIndex: 1,
      fontSize: 1, // Minimize visual impact if it flashes
    },
    boxesContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    box: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.otpBox,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    boxFilled: {
      backgroundColor: theme.colors.otpBox,
    },
    boxActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.otpBoxActive,
    },
    boxError: {
      borderColor: theme.colors.error,
    },
    digit: {
      fontWeight: 'bold',
      color: theme.colors.textBlack,
    },
    cursor: {
      position: 'absolute',
      width: 2,
      height: 24,
      backgroundColor: theme.colors.primary,
    },
  });
