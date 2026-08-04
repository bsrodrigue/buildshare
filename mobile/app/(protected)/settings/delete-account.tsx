import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { useDeleteAccount } from '@/modules/auth/api/hooks';
import { DeleteAccountParams, DeleteAccountParamsSchema } from '@/modules/auth/api/schemas';
import { ConfirmDialog } from '@/modules/shared/components/ConfirmDialog';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const mutation = useDeleteAccount();
  const [showPassword, setShowPassword] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeleteAccountParams>({
    resolver: zodResolver(DeleteAccountParamsSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = (_data: DeleteAccountParams) => {
    setConfirmVisible(true);
  };

  const onConfirmDelete = (data: DeleteAccountParams) => {
    setConfirmVisible(false);
    setFormError('');
    mutation.mutate(data, {
      onError: (err: AppError) => {
        const mapped = setFormErrors(err, setError);
        if (!mapped) {
          setFormError(err.message);
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <Surface
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface },
        ]}
        elevation={0}
      >
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {t('auth.delete_account.title')}
        </Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="bodyLarge" style={styles.warning}>
          {t('auth.delete_account.warning')}
        </Text>

        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.delete_account.password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.password}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword((p) => !p)}
                  />
                }
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password?.message}
          </HelperText>
        </View>

        {formError ? (
          <HelperText type="error" visible style={styles.errorText}>
            {formError}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          contentStyle={styles.submitContent}
          style={styles.deleteBtn}
        >
          {t('auth.delete_account.submit')}
        </Button>

        <ConfirmDialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          onConfirm={() => {
            void handleSubmit(onConfirmDelete)();
          }}
          title={t('auth.delete_account.confirm_title')}
          message={t('auth.delete_account.confirm_message')}
          confirmLabel={t('auth.delete_account.confirm_button')}
          cancelLabel={t('common.cancel')}
          confirmColor={theme.colors.error}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: { fontWeight: '700' },
  content: { padding: 24 },
  warning: { color: 'red', marginBottom: 24, opacity: 0.8 },
  fieldGroup: { marginBottom: 4 },
  input: { fontSize: 16 },
  deleteBtn: { marginTop: 16, borderRadius: 12, backgroundColor: 'red' },
  errorText: { marginTop: 8 },
  submitContent: { height: 52 },
});
