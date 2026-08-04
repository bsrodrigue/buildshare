import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { Button, HelperText, Icon, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setFormErrors } from '@/libs/api/forms';
import { AppError, BackendApiError } from '@/libs/api/types';
import { useResendOtp, useResetPassword } from '@/modules/auth/api/hooks';
import { ResetPasswordParams, ResetPasswordParamsSchema } from '@/modules/auth/api/schemas';
import { OtpInput } from '@/modules/shared/components/OtpInput';

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const mutation = useResetPassword();
  const resendMutation = useResendOtp();
  const passwordRef = useRef<NativeTextInput | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [codeError, setCodeError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!success) {
      return;
    }
    const timer = setTimeout(() => router.replace('/(auth)/login'), 1500);
    return () => clearTimeout(timer);
  }, [success]);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ResetPasswordParams>({
    resolver: zodResolver(ResetPasswordParamsSchema),
    defaultValues: { email: email || '', code: '', new_password: '' },
  });
  const code = watch('code');

  const onSubmit = useCallback(
    (data: ResetPasswordParams) => {
      mutation.mutate(data, {
        onError: (err: AppError) => {
          const mapped = setFormErrors(err, setError);
          if (!mapped && err instanceof BackendApiError) {
            // Server rejected the code (no field-level errors): surface it next to the OTP
            setCodeError(err.message);
            setValue('code', '', { shouldValidate: false });
          }
        },
        onSuccess: () => setSuccess(true),
      });
    },
    [mutation, setError, setValue],
  );

  const submit = useCallback(() => {
    if (getValues('code').length !== 6) {
      setCodeError(t('auth.reset_password.invalid_code'));
      return;
    }
    setCodeError('');
    void handleSubmit(onSubmit)();
  }, [t, handleSubmit, onSubmit, getValues]);

  const onComplete = useCallback(() => {
    if (getValues('new_password').length >= 8) {
      submit();
    } else {
      passwordRef.current?.focus();
    }
  }, [getValues, submit]);

  const onResend = () => {
    if (email) {
      resendMutation.mutate({ email });
      setCountdown(60);
    }
  };

  const hero = (
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
        {t('auth.reset_password.subtitle', { email: email || '' })}
      </Text>
    </Surface>
  );

  if (!email) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        {hero}
        <View style={styles.panelContent}>
          <Text variant="bodyLarge">{t('auth.reset_password.expired')}</Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={styles.submitBtn}
          >
            {t('auth.reset_password.request_new_code')}
          </Button>
        </View>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        {hero}
        <View style={[styles.panelContent, styles.successBox]}>
          <Icon source="check-circle" size={64} color={theme.colors.primary} />
          <Text variant="titleLarge" style={styles.successText}>
            {t('auth.reset_password.success')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      {hero}

      <ScrollView
        style={[styles.panel, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <OtpInput
              value={value}
              onChangeText={(text) => {
                onChange(text);
                setCodeError('');
              }}
              onComplete={onComplete}
              error={!!codeError}
              disabled={mutation.isPending}
            />
          )}
        />
        {codeError ? (
          <HelperText type="error" visible style={styles.errorText}>
            {codeError}
          </HelperText>
        ) : null}

        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="new_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                ref={passwordRef}
                label={t('auth.reset_password.password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.new_password}
                mode="outlined"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={submit}
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
          onPress={submit}
          loading={mutation.isPending}
          disabled={mutation.isPending || code.length !== 6}
          contentStyle={styles.submitContent}
          style={styles.submitBtn}
        >
          {t('auth.reset_password.submit')}
        </Button>

        <Button
          mode="text"
          onPress={onResend}
          disabled={countdown > 0 || resendMutation.isPending}
          style={styles.resendBtn}
        >
          {countdown > 0
            ? t('auth.reset_password.resend_countdown', { seconds: countdown })
            : t('auth.reset_password.resend')}
        </Button>

        <Button mode="text" onPress={() => router.replace('/(auth)/forgot-password')}>
          {t('auth.reset_password.not_your_email')}
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
  errorText: { textAlign: 'center', marginTop: 8 },
  submitBtn: { marginTop: 20, borderRadius: 12 },
  submitContent: { height: 52 },
  resendBtn: { marginTop: 8 },
  successBox: { alignItems: 'center', gap: 12 },
  successText: { textAlign: 'center' },
});
