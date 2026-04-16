import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/modules/shared/components/inputs/Button';
import { Input } from '@/modules/shared/components/inputs/Input';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Mot de passe actuel requis'),
    password: z.string().min(6, 'Le nouveau mot de passe doit faire au moins 6 caractères'),
    password_confirmation: z.string().min(1, 'Veuillez confirmer le mot de passe'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirmation'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ChangePasswordFormData) => Promise<void>;
  isLoading: boolean;
}

export const ChangePasswordModal = ({
  visible,
  onClose,
  onSave,
  isLoading,
}: ChangePasswordModalProps) => {
  const styles = useThemedStyles(createStyles);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  React.useEffect(() => {
    if (visible) {
      reset({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    }
  }, [visible, reset]);

  const onSubmit = (data: ChangePasswordFormData) => {
    onSave(data);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.sheetContent}>
            <SafeAreaView edges={['bottom']} style={styles.safeArea}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Changer le mot de passe</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeButton}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalForm}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                overScrollMode="never"
              >
                <Controller
                  control={control}
                  name="current_password"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Mot de passe actuel"
                      placeholder="Entrez votre mot de passe actuel"
                      value={value}
                      secureTextEntry
                      onChangeText={onChange}
                      error={errors.current_password?.message}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Nouveau mot de passe"
                      placeholder="Minimum 6 caractères"
                      value={value}
                      secureTextEntry
                      onChangeText={onChange}
                      error={errors.password?.message}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password_confirmation"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Confirmer le nouveau mot de passe"
                      placeholder="Retapez le nouveau mot de passe"
                      value={value}
                      secureTextEntry
                      onChangeText={onChange}
                      error={errors.password_confirmation?.message}
                      disabled={isLoading}
                    />
                  )}
                />

                <Button
                  title="Enregistrer"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  style={styles.saveButton}
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    keyboardAvoidingContainer: {
      width: '100%',
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: MODAL_MAX_HEIGHT,
      ...(theme.colorScheme === 'light' ? { backgroundColor: '#fff' } : {}),
    },
    sheetContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    safeArea: {
      flexShrink: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    modalTitle: {
      color: theme.colors.text,
      fontSize: theme.fontSize.lg,
      fontWeight: 'bold',
    },
    closeButton: {
      color: theme.colors.textSecondary,
      fontSize: theme.fontSize.md,
    },
    modalForm: {
      paddingBottom: theme.spacing.xl,
    },
    saveButton: {
      marginTop: theme.spacing.md,
    },
  });
