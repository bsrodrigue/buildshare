import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import type { Theme } from '@/modules/shared/theme';
import { toAlpha } from '@/modules/shared/theme/colors';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

import { Button } from './inputs/Button';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  /** Icon name from Ionicons */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Icon color */
  iconColor?: string;
  /** Enable text input field */
  showInput?: boolean;
  /** Placeholder for the text input */
  inputPlaceholder?: string;
  /** Whether the input is required before confirming */
  inputRequired?: boolean;
  /** Error message when input is required but empty */
  inputRequiredMessage?: string;
}

export const ConfirmationModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isDestructive = false,
  isLoading = false,
  iconName,
  iconColor,
  showInput = false,
  inputPlaceholder = '',
  inputRequired = false,
  inputRequiredMessage = 'Ce champ est requis',
}: ConfirmationModalProps) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const { styles, tokens } = useThemedStyles(createStyles);

  // Reset input state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setInputValue('');
      setInputError('');
    }
  }, [visible]);

  const handleConfirm = () => {
    if (showInput && inputRequired && inputValue.trim() === '') {
      setInputError(inputRequiredMessage);
      return;
    }
    setInputError('');
    onConfirm(showInput ? inputValue.trim() : undefined);
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    if (inputError) {
      setInputError('');
    }
  };

  const resolvedIconColor = iconColor || (isDestructive ? tokens.error : tokens.success);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Close button */}
              <TouchableOpacity
                onPress={onCancel}
                disabled={isLoading}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={tokens.textSecondary} />
              </TouchableOpacity>

              {/* Icon + Title + Message */}
              <View style={styles.body}>
                {iconName && (
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: toAlpha(resolvedIconColor, 0.12) },
                    ]}
                  >
                    <Ionicons name={iconName} size={32} color={resolvedIconColor} />
                  </View>
                )}

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              {showInput && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, inputError ? styles.inputError : null]}
                    placeholder={inputPlaceholder}
                    placeholderTextColor={tokens.placeholder}
                    value={inputValue}
                    onChangeText={handleInputChange}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title={confirmText}
                  onPress={handleConfirm}
                  style={[styles.button, isDestructive && styles.destructiveButton]}
                  textStyle={styles.buttonText}
                  isLoading={isLoading}
                  borderRadius={12}
                />
                <Button
                  title={cancelText}
                  onPress={onCancel}
                  variant="outline"
                  style={styles.button}
                  textStyle={styles.buttonText}
                  disabled={isLoading}
                  borderRadius={12}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (theme: Theme) => ({
  styles: StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      paddingTop: 24,
      paddingBottom: 20,
      paddingHorizontal: 20,
      width: '90%',
      maxWidth: 360,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
    closeButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      zIndex: 1,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      alignItems: 'center',
      paddingTop: 8,
      marginBottom: 20,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 17,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: theme.spacing.md,
      color: theme.colors.text,
      fontSize: 14,
      minHeight: 80,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 6,
    },
    actions: {
      gap: 8,
    },
    button: {
      width: '100%',
      minWidth: 0,
      paddingVertical: 14,
    },
    buttonText: {
      fontSize: 15,
    },
    destructiveButton: {
      backgroundColor: theme.colors.error,
    },
  }),
  tokens: {
    success: theme.colors.success,
    error: theme.colors.error,
    placeholder: theme.colors.placeholder,
    textSecondary: theme.colors.textSecondary,
  },
});
