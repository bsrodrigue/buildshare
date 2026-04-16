import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { ROUTES } from '@/constants/routes';
import { createLogger } from '@/libs/log';
import { useForgotPassword } from '@/modules/auth/api/hooks';
import { ForgotPasswordParams, ForgotPasswordParamsSchema } from '@/modules/auth/api/schemas';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = createLogger('ForgotPasswordScreen');

const ForgotPasswordScreen = () => {
  logger.debug('Render Screen');

  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordParams>({
    resolver: zodResolver(ForgotPasswordParamsSchema),
    defaultValues: { login: '' },
  });

  const { mutate: callForgotPassword, isPending: isLoading } = useForgotPassword();

  const onSubmit = (data: ForgotPasswordParams) => {
    callForgotPassword(data, {
      onSuccess() {
        router.push({
          pathname: ROUTES.AUTH.RESET_PASSWORD,
          params: { login: data.login },
        });
      },
      onError(error) {
        setErrorMessage(error.message);
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Mot de passe oublié
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Entrez votre adresse email ou numéro de téléphone pour recevoir un code de réinitialisation.
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
              disabled={isLoading}
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

      <Button
        mode="contained"
        loading={isLoading}
        onPress={() => {
          void handleSubmit(onSubmit)();
        }}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        ENVOYER LE CODE
      </Button>

      <Button
        mode="text"
        onPress={() => router.push(ROUTES.AUTH.LOGIN)}
        disabled={isLoading}
        style={styles.backButton}
      >
        Retour à la connexion
      </Button>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
      marginBottom: theme.spacing.lg,
    },
    input: {
      backgroundColor: 'transparent',
    },
    errorText: {
      marginBottom: theme.spacing.sm,
      paddingHorizontal: 0,
    },
    submitButton: {
      marginTop: theme.spacing.sm,
      borderRadius: 8,
    },
    submitButtonContent: {
      paddingVertical: 6,
    },
    backButton: {
      marginTop: theme.spacing.md,
    },
  });

ForgotPasswordScreen.displayName = 'ForgotPasswordScreen';
export default ForgotPasswordScreen;
