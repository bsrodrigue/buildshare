import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
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

import { useVerifyChangeEmail } from '@/modules/auth/api/hooks';

export default function ChangeEmailVerifyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { newEmail } = useLocalSearchParams<{ newEmail: string }>();
  const mutation = useVerifyChangeEmail();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const onVerify = () => {
    if (code.length !== 6) {
      setError(t('auth.change_email_verify.invalid_code'));
      return;
    }
    setError('');
    mutation.mutate({ new_email: newEmail || '', code });
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
          {t('auth.change_email_verify.title')}
        </Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="bodyLarge" style={styles.description}>
          {t('auth.change_email_verify.subtitle', { email: newEmail })}
        </Text>

        <TextInput
          label={t('auth.change_email_verify.code_label')}
          value={code}
          onChangeText={setCode}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
          error={!!error}
        />
        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={onVerify}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          contentStyle={styles.submitContent}
          style={styles.submitBtn}
        >
          {t('auth.change_email_verify.submit')}
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
  description: { marginBottom: 24, opacity: 0.7 },
  codeInput: { fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  submitBtn: { marginTop: 16, borderRadius: 12 },
  submitContent: { height: 52 },
});
