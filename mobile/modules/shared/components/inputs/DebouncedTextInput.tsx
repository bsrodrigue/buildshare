import React, { useEffect, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface DebouncedTextInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  debounceMs?: number;
}

export const DebouncedTextInput = ({
  value,
  onChangeText,
  debounceMs = 800,
  ...props
}: DebouncedTextInputProps) => {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeText(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, value, onChangeText]);

  return <TextInput {...props} value={localValue} onChangeText={setLocalValue} />;
};
