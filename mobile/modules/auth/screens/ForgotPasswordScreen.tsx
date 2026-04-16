import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { useForgotPassword } from '@/modules/auth/api/hooks';
import { ErrorMessage } from '@/modules/shared/components/ErrorMessage';
import { Button } from '@/modules/shared/components/inputs/Button';
import { Input } from '@/modules/shared/components/inputs/Input';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const forgotPasswordSchema = z.object({
  login: z.string().min(1, 'Login requis'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles(createStyles);

  const { callForgotPassword, isLoading } = useForgotPassword({
    onSuccess() {
      router.push({
        pathname: '/(auth)/reset-password',
        params: { login: getValues('login') },
      });
    },
    onError(error) {
      setErrorMessage(error.message);
    },
  });

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { login: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await callForgotPassword(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mot de passe oublié ?</Text>
      <Text style={styles.subtitle}>
        Entrez votre login (email ou téléphone) pour recevoir un code de réinitialisation.
      </Text>

      <ErrorMessage message={errorMessage} />

      <Controller
        control={control}
        name="login"
        render={({ field: { onChange, value } }) => (
          <Input
            placeholder="Email ou Téléphone"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            disabled={isLoading}
            error={errors.login?.message}
          />
        )}
      />

      <Button
        title="ENVOYER LE CODE"
        isLoading={isLoading}
        onPress={handleSubmit(onSubmit)}
        fontSize="sm"
        fontWeight="medium"
      />

      <Button
        variant="ghost"
        title="Retour à la connexion"
        onPress={() => router.push('/(auth)/login')}
        disabled={isLoading}
        textColor={styles.backText.color}
        style={styles.backButton}
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
    backButton: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    backText: {
      color: theme.colors.primary,
    },
  });

ForgotPasswordScreen.displayName = 'ForgotPasswordScreen';

export default ForgotPasswordScreen;
