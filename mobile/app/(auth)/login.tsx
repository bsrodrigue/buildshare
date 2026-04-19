import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { Controller,useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView,StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { createLogger } from '@/libs/log';
import { useLogin } from '@/modules/auth/api/hooks';
import { LoginParams, LoginParamsSchema } from '@/modules/auth/api/schemas';

const logger = createLogger('LoginScreen');

export default function LoginScreen() {
  logger.info('Render LoginScreen');

  const theme = useTheme();
  const { t } = useTranslation();
  const mutation = useLogin();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginParams>({
    resolver: zodResolver(LoginParamsSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onLogin = (data: LoginParams) => {
    mutation.mutate(data, {
      onError: (err: AppError) => setFormErrors(err, setError),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={styles.title}>
            {t('auth.login.title')}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
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
            {errors.email && (
              <Text style={{ color: theme.colors.error }} variant="bodySmall">
                {errors.email.message}
              </Text>
            )}

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
                  secureTextEntry
                  style={styles.input}
                />
              )}
            />
            {errors.password && (
              <Text style={{ color: theme.colors.error }} variant="bodySmall">
                {errors.password.message}
              </Text>
            )}

            <Button
              mode="contained"
              onPress={() => { void handleSubmit(onLogin)(); }}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              style={styles.button}
            >
              {t('auth.login.submit')}
            </Button>

            <Button mode="text" onPress={() => { void router.push('/(auth)/register'); }} style={styles.link}>
              {t('auth.login.register_link')}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  subtitle: {
    opacity: 0.7,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
    paddingVertical: 6,
  },
  link: {
    marginTop: 10,
  },
});
