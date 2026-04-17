import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useLogin } from '@/modules/auth/api/hooks';
import { LoginParams, LoginParamsSchema } from '@/modules/auth/api/schemas';

import { setFormErrors } from '@/libs/api/forms';

import { createLogger } from '@/libs/log';

const logger = createLogger('LoginScreen');

export default function LoginScreen() {
  logger.info('Render LoginScreen');

  const theme = useTheme();
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
      onError: (err) => setFormErrors(err, setError),
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
            App-share
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Connectez-vous pour gérer vos builds.
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
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
                  label="Mot de passe"
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
              onPress={handleSubmit(onLogin)}
              loading={mutation.isPending}
              disabled={mutation.isPending}
              style={styles.button}
            >
              Se connecter
            </Button>

            <Button mode="text" onPress={() => router.push('/(auth)/register')} style={styles.link}>
              Pas de compte ? S'inscrire
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
