import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { z } from 'zod';

import { ROUTES } from '@/constants/routes';
import { AppConfiguration } from '@/libs/app-config';
import { createLogger } from '@/libs/log';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { useLogin } from '@/modules/auth/api/hooks';
import { useAuthStore } from '@/modules/auth/store';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = createLogger('LoginScreen');

const loginSchema = z.object({
  login: z.string().min(1, 'Login requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const defaultLoginValues: LoginFormData = {
  login: '',
  password: '',
};

const LoginScreen = () => {
  logger.debug('Render Screen');

  const router = useRouter();
  const { setUser } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: defaultLoginValues,
  });

  const { mutate: callLogin, isPending: isLoading } = useLogin();

  const onSubmit = (data: LoginFormData) => {
    callLogin(data, {
      onSuccess(response) {
        void (async () => {
          const { user, token } = response.data;

          await SecureStorage.setItem(SecureStorageKey.BEARER_TOKEN, token);
          setUser(user);
        })();
      },

      onError(error) {
        setErrorMessage(error.message);
      },
    });
  };

  return (
    <>
      <Text variant="headlineSmall" style={styles.title}>
        Bienvenue chez {AppConfiguration.appName}!
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Pour continuer, veuillez saisir vos informations.
      </Text>

      {errorMessage && (
        <HelperText type="error" visible={!!errorMessage} style={styles.errorText}>
          {errorMessage}
        </HelperText>
      )}

      <Controller
        control={control}
        name="login"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Numéro de téléphone ou email"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={isLoading}
              error={!!errors.login}
              style={styles.input}
            />
            {errors.login && (
              <HelperText type="error" visible={!!errors.login}>
                {errors.login.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Mot de passe"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              disabled={isLoading}
              autoComplete="password"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={!!errors.password}
              style={styles.input}
            />
            {errors.password && (
              <HelperText type="error" visible={!!errors.password}>
                {errors.password.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Button
        mode="text"
        onPress={() => router.push(ROUTES.AUTH.FORGOT_PASSWORD as Href)}
        disabled={isLoading}
        style={styles.forgotPasswordButton}
        compact
      >
        Mot de passe oublié ?
      </Button>

      <Button
        mode="contained"
        loading={isLoading}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        SUIVANT
      </Button>

      <Button
        mode="text"
        onPress={() => router.push(ROUTES.AUTH.REGISTER as Href)}
        disabled={isLoading}
        style={styles.toggleButton}
      >
        Pas de compte? Inscrivez-vous
      </Button>
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      opacity: 0.7,
    },
    inputContainer: {
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: 'transparent',
    },
    errorText: {
      marginBottom: theme.spacing.sm,
      paddingHorizontal: 0,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end',
      marginBottom: theme.spacing.lg,
    },
    submitButton: {
      marginTop: theme.spacing.sm,
      borderRadius: 8,
    },
    submitButtonContent: {
      paddingVertical: 6,
    },
    toggleButton: {
      marginTop: theme.spacing.lg,
    },
  });

LoginScreen.displayName = 'LoginScreen';
export default LoginScreen;
