import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { ROUTES } from '@/constants/routes';
import { AppConfiguration } from '@/libs/app-config';
import { Logger } from '@/libs/log';
import PushNotificationService from '@/libs/push-notification/init';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { PasswordInput } from '@/modules/auth/components/inputs/PasswordInput';
import { useLogin } from '@/modules/auth/api/hooks';
import { useAuthStore } from '@/modules/auth/store';
import { registerDeviceToken } from '@/modules/device-tokens/api';
import { ErrorMessage } from '@/modules/shared/components/ErrorMessage';
import { Button } from '@/modules/shared/components/inputs/Button';
import { Input } from '@/modules/shared/components/inputs/Input';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = new Logger('LoginScreen');

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
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: defaultLoginValues,
  });

  const { callLogin, isLoading } = useLogin({
    async onSuccess(response) {
      const { user, token } = response.data;

      SecureStorage.setItem(SecureStorageKey.BEARER_TOKEN, token);
      setUser(user);

      // Register device token for push notifications
      try {
        const deviceInfo = await PushNotificationService.getDeviceInfo();
        await registerDeviceToken(deviceInfo);
      } catch (error) {
        logger.error(`Failed to register device token: ${error}`);
      }
    },

    onError(error) {
      setErrorMessage(error.message);

      if (error.code === 'PHONE_NOT_VERIFIED') {
        const login = getValues('login');
        const isEmail = login.includes('@');
        const isPhone = /^\+?[0-9]+$/.test(login.replace(/[\s-]/g, ''));

        if (isEmail || !isPhone) {
          setErrorMessage(
            'Veuillez utiliser votre numéro de téléphone pour la validation initiale.',
          );
          return;
        }

        router.push({
          pathname: ROUTES.AUTH.OTP,
          params: { phone: login },
        });
      }
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    await callLogin(data);
  };

  return (
    <>
      <Text style={styles.title}>Bienvenue chez {AppConfiguration.appName}!</Text>
      <Text style={styles.subtitle}>Pour continuer, veuillez saisir vos informations.</Text>

      <ErrorMessage message={errorMessage} />

      <Controller
        control={control}
        name="login"
        render={({ field: { onChange, value } }) => (
          <Input
            label="Numéro de téléphone ou email"
            placeholder="Login"
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            disabled={isLoading}
            error={errors.login?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <PasswordInput
            label="Mot de passe"
            placeholder="Mot de passe"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            disabled={isLoading}
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />

      <Button
        variant="ghost"
        title="Mot de passe oublié ?"
        onPress={() => router.push(ROUTES.AUTH.FORGOT_PASSWORD as Href)}
        disabled={isLoading}
        style={styles.forgotPasswordButton}
      />

      <Button
        title="SUIVANT"
        isLoading={isLoading}
        onPress={handleSubmit(onSubmit)}
        fontSize="sm"
        fontWeight="medium"
      />

      <Button
        variant="ghost"
        title="Pas de compte? Inscrivez-vous"
        onPress={() => router.push(ROUTES.AUTH.REGISTER as Href)}
        disabled={isLoading}
        textColor={styles.toggleText.color}
        style={styles.toggleButton}
        fontSize="sm"
        fontWeight="normal"
      />
    </>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end',
      marginBottom: theme.spacing.lg,
    },
    toggleButton: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    toggleText: {
      color: theme.colors.primary,
    },
  });

LoginScreen.displayName = 'LoginScreen';
export default LoginScreen;
