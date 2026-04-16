import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export const Select = ({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  disabled = false,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;
  const hasLabel = !!label;

  return (
    <View style={styles.container}>
      {hasLabel && <Text style={styles.topLabel}>{label}</Text>}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text
          style={[styles.selectText, !selectedOption && styles.placeholderText]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="caret-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.selectedOption]}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[styles.optionText, item.value === value && styles.selectedOptionText]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    topLabel: {
      fontSize: 11,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      height: 48,
      backgroundColor: theme.colors.inputBackground,
    },
    disabled: {
      opacity: 0.5,
    },
    selectText: {
      flex: 1,
      color: theme.colors.inputText,
      fontSize: theme.fontSize.md,
    },
    placeholderText: {
      color: theme.colors.placeholder,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.background, // Use solid background
      borderRadius: theme.borderRadius.md,
      width: '85%',
      maxHeight: '70%',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    selectedOption: {
      backgroundColor: theme.colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    optionText: {
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
    },
    selectedOptionText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });
