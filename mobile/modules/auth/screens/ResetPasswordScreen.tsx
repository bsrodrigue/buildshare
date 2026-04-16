import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { ROUTES } from '@/constants/routes';
import { createLogger } from '@/libs/log';
import { useResetPassword } from '@/modules/auth/api/hooks';
import { ResetPasswordParams, ResetPasswordParamsSchema } from '@/modules/auth/api/schemas';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = createLogger('ResetPasswordScreen');

const ResetPasswordScreen = () => {
  logger.debug('Render Screen');

  const router = useRouter();
  const params = useLocalSearchParams<{ login: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordParams>({
    resolver: zodResolver(ResetPasswordParamsSchema),
    defaultValues: {
      login: params.login || '',
      code: '',
      password: '',
      password_confirmation: '',
    },
  });

  const { mutate: callResetPassword, isPending: isLoading } = useResetPassword();

  const onSubmit = (data: ResetPasswordParams) => {
    callResetPassword(data, {
      onSuccess() {
        router.push(ROUTES.AUTH.LOGIN);
      },
      onError(error) {
        setErrorMessage(error.message);
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text variant="headlineSmall" style={styles.title}>
        Réinitialiser le mot de passe
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Veuillez entrer le code reçu et votre nouveau mot de passe.
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
              label="Email ou téléphone"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              disabled={isLoading || !!params.login}
              error={!!errors.login}
              style={styles.input}
              autoCapitalize="none"
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
        name="code"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Code de vérification"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              disabled={isLoading}
              error={!!errors.code}
              style={styles.input}
              keyboardType="number-pad"
            />
            {errors.code && (
              <HelperText type="error" visible={!!errors.code}>
                {errors.code.message}
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
              label="Nouveau mot de passe"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              disabled={isLoading}
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

      <Controller
        control={control}
        name="password_confirmation"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Confirmer le mot de passe"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              disabled={isLoading}
              secureTextEntry={!showPassword}
              error={!!errors.password_confirmation}
              style={styles.input}
            />
            {errors.password_confirmation && (
              <HelperText type="error" visible={!!errors.password_confirmation}>
                {errors.password_confirmation.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Button
        mode="contained"
        loading={isLoading}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        RÉINITIALISER
      </Button>

      <Button
        mode="text"
        onPress={() => router.push(ROUTES.AUTH.LOGIN)}
        disabled={isLoading}
        style={styles.backButton}
      >
        Retour à la connexion
      </Button>
    </ScrollView>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    title: {
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      opacity: 0.7,
      lineHeight: 24,
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
    submitButton: {
      marginTop: theme.spacing.md,
      borderRadius: 8,
    },
    submitButtonContent: {
      paddingVertical: 6,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });

ResetPasswordScreen.displayName = 'ResetPasswordScreen';
export default ResetPasswordScreen;
