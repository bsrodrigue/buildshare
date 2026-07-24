import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResendOtp, useVerifyOtp } from '@/modules/auth/api/hooks';
import { OtpInput } from '@/modules/shared/components/OtpInput';

export default function VerifyOtpScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyMutation = useVerifyOtp();
  const resendMutation = useResendOtp();
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onVerify = useCallback(
    (otpCode?: string) => {
      const codeToVerify = otpCode || code;
      if (codeToVerify.length !== 6) {
        setError(t('auth.verify_otp.invalid_code'));
        return;
      }
      setError('');
      verifyMutation.mutate({ email: email || '', code: codeToVerify });
    },
    [code, email, t, verifyMutation],
  );

  const onComplete = useCallback(
    (fullCode: string) => {
      onVerify(fullCode);
    },
    [onVerify],
  );

  const onResend = () => {
    if (email) {
      resendMutation.mutate({ email });
      setCountdown(60);
    }
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
          {t('auth.verify_otp.title')}
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.heroSubtitle, { color: theme.colors.onPrimaryContainer }]}
        >
          {t('auth.verify_otp.subtitle')}
        </Text>
      </Surface>

      <ScrollView
        style={[styles.panel, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.panelContent}
        keyboardShouldPersistTaps="handled"
      >
        <OtpInput
          value={code}
          onChangeText={setCode}
          onComplete={onComplete}
          error={!!error}
          disabled={verifyMutation.isPending}
        />
        {error ? (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={() => onVerify()}
          loading={verifyMutation.isPending}
          disabled={verifyMutation.isPending || code.length !== 6}
          contentStyle={styles.submitContent}
          style={styles.submitBtn}
        >
          {t('auth.verify_otp.submit')}
        </Button>

        <Button
          mode="text"
          onPress={onResend}
          disabled={countdown > 0 || resendMutation.isPending}
          style={styles.resendBtn}
        >
          {countdown > 0
            ? t('auth.verify_otp.resend_countdown', { seconds: countdown })
            : t('auth.verify_otp.resend')}
        </Button>

        <Button mode="text" onPress={() => router.replace('/(auth)/login')} style={styles.backBtn}>
          {t('auth.verify_otp.back_to_login')}
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
  errorText: { textAlign: 'center', marginTop: 8 },
  submitBtn: { marginTop: 20, borderRadius: 12 },
  submitContent: { height: 52 },
  resendBtn: { marginTop: 8 },
  backBtn: { marginTop: 4 },
});
