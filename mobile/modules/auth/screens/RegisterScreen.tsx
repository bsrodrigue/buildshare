import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { ROUTES } from '@/constants/routes';
import { AppConfiguration } from '@/libs/app-config';
import { createLogger } from '@/libs/log';
import { useRegister } from '@/modules/auth/api/hooks';
import { RegisterParams, RegisterParamsSchema } from '@/modules/auth/api/schemas';
import type { Theme } from '@/modules/shared/theme';
import { useThemedStyles } from '@/modules/shared/theme/useThemedStyles';

const logger = createLogger('RegisterScreen');

const defaultRegisterValues: Partial<RegisterParams> = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  role: 'client',
  password: '',
  passwordConfirmation: '',
};

const RegisterScreen = () => {
  logger.debug('Render Screen');

  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const styles = useThemedStyles(createStyles);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterParams>({
    resolver: zodResolver(RegisterParamsSchema),
    defaultValues: defaultRegisterValues as RegisterParams,
  });

  const { mutate: callRegister, isPending: isLoading } = useRegister();

  const onSubmit = (data: RegisterParams) => {
    callRegister(data, {
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
        Créer un compte
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Rejoignez {AppConfiguration.appName} dès aujourd&apos;hui.
      </Text>

      {errorMessage && (
        <HelperText type="error" visible={!!errorMessage} style={styles.errorText}>
          {errorMessage}
        </HelperText>
      )}

      <View style={styles.row}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value } }) => (
            <View style={styles.flexHalfLeft}>
              <TextInput
                label="Prénom"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                disabled={isLoading}
                error={!!errors.firstName}
                style={styles.input}
              />
              {errors.firstName && (
                <HelperText type="error" visible={!!errors.firstName}>
                  {errors.firstName.message}
                </HelperText>
              )}
            </View>
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, value } }) => (
            <View style={styles.flexHalf}>
              <TextInput
                label="Nom"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                disabled={isLoading}
                error={!!errors.lastName}
                style={styles.input}
              />
              {errors.lastName && (
                <HelperText type="error" visible={!!errors.lastName}>
                  {errors.lastName.message}
                </HelperText>
              )}
            </View>
          )}
        />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Email"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              disabled={isLoading}
              error={!!errors.email}
              style={styles.input}
            />
            {errors.email && (
              <HelperText type="error" visible={!!errors.email}>
                {errors.email.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phoneNumber"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Téléphone"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              disabled={isLoading}
              error={!!errors.phoneNumber}
              style={styles.input}
            />
            {errors.phoneNumber && (
              <HelperText type="error" visible={!!errors.phoneNumber}>
                {errors.phoneNumber.message}
              </HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Je suis un :</Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: 'client', label: 'Client' },
                { value: 'seller', label: 'Vendeur' },
                { value: 'delivery_man', label: 'Livreur' },
              ]}
            />
            {errors.role && (
              <HelperText type="error" visible={!!errors.role}>
                {errors.role.message}
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
        name="passwordConfirmation"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label="Confirmation du mot de passe"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              disabled={isLoading}
              secureTextEntry={!showPassword}
              error={!!errors.passwordConfirmation}
              style={styles.input}
            />
            {errors.passwordConfirmation && (
              <HelperText type="error" visible={!!errors.passwordConfirmation}>
                {errors.passwordConfirmation.message}
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
        S&apos;INSCRIRE
      </Button>

      <Button
        mode="text"
        onPress={() => router.push(ROUTES.AUTH.LOGIN)}
        disabled={isLoading}
        style={styles.toggleButton}
      >
        Déjà un compte? Connectez-vous
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
    },
    row: {
      flexDirection: 'row',
    },
    inputContainer: {
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: 'transparent',
    },
    label: {
      marginBottom: theme.spacing.xs,
      color: theme.colors.text,
      opacity: 0.8,
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
    toggleButton: {
      marginTop: theme.spacing.md,
    },
    flexHalfLeft: {
      flex: 1,
      marginRight: 8,
      marginBottom: theme.spacing.sm,
    },
    flexHalf: {
      flex: 1,
      marginBottom: theme.spacing.sm,
    },
  });

RegisterScreen.displayName = 'RegisterScreen';
export default RegisterScreen;
