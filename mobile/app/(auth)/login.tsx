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
import { createLogger } from '@/libs/log';
import { useLogin } from '@/modules/auth/api/hooks';
import { LoginParams, LoginParamsSchema } from '@/modules/auth/api/schemas';
import { ApiConfigModal } from '@/modules/shared/components/ApiConfigModal';

const logger = createLogger('LoginScreen');

export default function LoginScreen() {
  logger.info('Render LoginScreen');

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const mutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginParams>({
    resolver: zodResolver(LoginParamsSchema),
    defaultValues: { email: '', password: '' },
  });

  const onLogin = (data: LoginParams) => {
    mutation.mutate(data, {
      onError: (err: AppError) => setFormErrors(err, setError),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {/* ── Hero ── */}
      <Surface
        style={[
          styles.hero,
          { paddingTop: insets.top + 20, backgroundColor: theme.colors.primaryContainer },
        ]}
        elevation={0}
      >
        <IconButton
          icon="cog-outline"
          size={20}
          iconColor={theme.colors.onPrimaryContainer}
          style={styles.configBtn}
          onPress={() => setConfigVisible(true)}
        />

        {/* Logo mark */}
        <View style={[styles.logoMark, { backgroundColor: theme.colors.primary }]}>
          <View style={[styles.logoInner, { backgroundColor: theme.colors.onPrimary }]} />
        </View>

        <Text
          variant="displaySmall"
          style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.login.title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.heroSubtitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.login.subtitle')}
        </Text>
      </Surface>

      {/* ── Form ── */}
      <ScrollView
        style={[styles.panel, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Email */}
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.login.email_label')}
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

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.login.password_label')}
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

        {/* Submit */}
        <Button
          mode="contained"
          onPress={() => {
            void handleSubmit(onLogin)();
          }}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          contentStyle={styles.submitContent}
          style={styles.submitBtn}
        >
          {t('auth.login.submit')}
        </Button>

        {/* Switch */}
        <Button
          mode="text"
          onPress={() => {
            void router.push('/(auth)/register');
          }}
          style={styles.switchBtn}
        >
          {t('auth.login.register_link')}
        </Button>
      </ScrollView>

      {/* Dev API config modal — rendered even outside __DEV__ guard because Portal
          needs JSX to exist, but the trigger button above is __DEV__-gated. */}
      <ApiConfigModal visible={configVisible} onDismiss={() => setConfigVisible(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ── Hero ── */
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  configBtn: {
    alignSelf: 'flex-end',
    marginRight: -8,
    marginBottom: 4,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  logoInner: {
    width: 28,
    height: 28,
    borderRadius: 8,
    opacity: 0.85,
  },
  heroTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    opacity: 0.75,
  },

  /* ── Panel ── */
  panel: { flex: 1 },
  panelContent: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },

  /* ── Fields ── */
  fieldGroup: { marginBottom: 4 },
  input: { fontSize: 16 },

  /* ── Actions ── */
  submitBtn: {
    marginTop: 12,
    borderRadius: 12,
  },
  submitContent: { height: 52 },
  switchBtn: { marginTop: 8 },
});
