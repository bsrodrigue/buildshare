import { zodResolver } from '@hookform/resolvers/zod';
import { type Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { ROUTES } from '@/constants/routes';
import { Toaster } from '@/libs/notification/toast';
import { useValidatedParams } from '@/libs/router';
import { OTPInput } from '@/modules/auth/components/inputs/OTPInput';
import { PasswordInput } from '@/modules/auth/components/inputs/PasswordInput';
import { useResetPassword } from '@/modules/auth/api/hooks';
import { ErrorMessage } from '@/modules/shared/components/ErrorMessage';
import { Button } from '@/modules/shared/components/inputs/Button';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const resetPasswordParamsSchema = z.object({
  login: z.string().min(1, 'Login requis'),
});

const resetPasswordSchema = z
  .object({
    code: z.string().min(1, 'Code requis'),
    password: z.string().min(1, 'Mot de passe requis'),
    password_confirmation: z.string().min(1, 'Confirmation du mot de passe requise'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirmation'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordScreen = () => {
  const { params, isValid } = useValidatedParams(
    resetPasswordParamsSchema,
    ROUTES.AUTH.FORGOT_PASSWORD,
  );
  const { login } = params;
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles(createStyles);

  const { callResetPassword, isLoading } = useResetPassword({
    onSuccess(response) {
      Toaster.success('Succès', response.message);
      router.replace(ROUTES.AUTH.LOGIN as Href);
    },
    onError(error) {
      setErrorMessage(error.message);
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!login) return;
    await callResetPassword({
      ...data,
      login,
    });
  };

  if (!isValid) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Réinitialisation</Text>
      <Text style={styles.subtitle}>Entrez le code reçu et votre nouveau mot de passe.</Text>

      <ErrorMessage message={errorMessage} />

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, value } }) => (
          <OTPInput length={6} value={value} onChange={onChange} error={!!errors.code?.message} />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <PasswordInput
            placeholder="Nouveau mot de passe"
            value={value}
            onChangeText={onChange}
            disabled={isLoading}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password_confirmation"
        render={({ field: { onChange, value } }) => (
          <PasswordInput
            placeholder="Confirmer le mot de passe"
            value={value}
            onChangeText={onChange}
            disabled={isLoading}
            error={errors.password_confirmation?.message}
          />
        )}
      />

      <Button
        title="RÉINITIALISER"
        isLoading={isLoading}
        onPress={handleSubmit(onSubmit)}
        fontSize="sm"
        fontWeight="medium"
      />

      <Button
        variant="ghost"
        title="Annuler"
        onPress={() => router.push(ROUTES.AUTH.LOGIN as Href)}
        disabled={isLoading}
        textColor={styles.cancelText.color}
        style={styles.cancelButton}
        fontSize="sm"
        fontWeight="normal"
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
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
    cancelButton: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    cancelText: {
      color: theme.colors.textSecondary,
    },
  });

ResetPasswordScreen.displayName = 'ResetPasswordScreen';

export default ResetPasswordScreen;
