import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { useForgotPassword } from '@/modules/auth/api/hooks';
import { ForgotPasswordParams, ForgotPasswordParamsSchema } from '@/modules/auth/api/schemas';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const mutation = useForgotPassword();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordParams>({
    resolver: zodResolver(ForgotPasswordParamsSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: ForgotPasswordParams) => {
    mutation.mutate(data, {
      onError: (err: AppError) => setFormErrors(err, setError),
      onSuccess: () => {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { email: data.email },
        });
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
          styles.hero,
          { paddingTop: insets.top + 20, backgroundColor: theme.colors.primaryContainer },
        ]}
        elevation={0}
      >
        <Text
          variant="displaySmall"
          style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.forgot_password.title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.heroSubtitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.forgot_password.subtitle')}
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
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.forgot_password.email_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.email}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email?.message}
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
          {t('auth.forgot_password.submit')}
        </Button>

        <Button mode="text" onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
          {t('auth.forgot_password.back_to_login')}
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
