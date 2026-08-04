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
import { useChangePassword } from '@/modules/auth/api/hooks';
import { ChangePasswordParams, ChangePasswordParamsSchema } from '@/modules/auth/api/schemas';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const mutation = useChangePassword();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordParams>({
    resolver: zodResolver(ChangePasswordParamsSchema),
    defaultValues: { current_password: '', new_password: '' },
  });

  const onSubmit = (data: ChangePasswordParams) => {
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
          {t('auth.change_password.title')}
        </Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="current_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.change_password.current_password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.current_password}
                mode="outlined"
                secureTextEntry={!showCurrentPassword}
                right={
                  <TextInput.Icon
                    icon={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowCurrentPassword((p) => !p)}
                  />
                }
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.current_password}>
            {errors.current_password?.message}
          </HelperText>
        </View>

        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="new_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.change_password.new_password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.new_password}
                mode="outlined"
                secureTextEntry={!showNewPassword}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowNewPassword((p) => !p)}
                  />
                }
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.new_password}>
            {errors.new_password?.message}
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
          style={styles.submitBtn}
        >
          {t('auth.change_password.submit')}
        </Button>
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
  fieldGroup: { marginBottom: 4 },
  input: { fontSize: 16 },
  errorText: { marginTop: 8 },
  submitBtn: { marginTop: 16, borderRadius: 12 },
  submitContent: { height: 52 },
});
