import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { useResetPassword } from '@/modules/auth/api/hooks';
import { ResetPasswordParams, ResetPasswordParamsSchema } from '@/modules/auth/api/schemas';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const mutation = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordParams>({
    resolver: zodResolver(ResetPasswordParamsSchema),
    defaultValues: { token: token || '', new_password: '' },
  });

  const onSubmit = (data: ResetPasswordParams) => {
    mutation.mutate(data, {
      onError: (err: AppError) => setFormErrors(err, setError),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <Surface
        style={[
          styles.hero,
          { paddingTop: insets.top + 20, backgroundColor: theme.colors.primaryContainer },
        ]}
        elevation={0}
      >
        <Text
          variant="displaySmall"
          style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.reset_password.title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.heroSubtitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.reset_password.subtitle')}
        </Text>
      </Surface>

      <ScrollView
        style={[styles.panel, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="new_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.reset_password.password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.new_password}
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
          <HelperText type="error" visible={!!errors.new_password}>
            {errors.new_password?.message}
          </HelperText>
        </View>

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
          {t('auth.reset_password.submit')}
        </Button>

        <Button mode="text" onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
          {t('auth.reset_password.back_to_login')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroTitle: { fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  heroSubtitle: { opacity: 0.75 },
  panel: { flex: 1 },
  panelContent: { padding: 24, paddingTop: 28, paddingBottom: 48 },
  fieldGroup: { marginBottom: 4 },
  input: { fontSize: 16 },
  submitBtn: { marginTop: 12, borderRadius: 12 },
  submitContent: { height: 52 },
  backBtn: { marginTop: 8 },
});
