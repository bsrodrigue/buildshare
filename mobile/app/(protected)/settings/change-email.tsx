import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
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

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { useChangeEmail } from '@/modules/auth/api/hooks';
import { ChangeEmailParams, ChangeEmailParamsSchema } from '@/modules/auth/api/schemas';

export default function ChangeEmailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const mutation = useChangeEmail();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangeEmailParams>({
    resolver: zodResolver(ChangeEmailParamsSchema),
    defaultValues: { new_email: '', password: '' },
  });

  const onSubmit = (data: ChangeEmailParams) => {
    mutation.mutate(data, {
      onError: (err: AppError) => setFormErrors(err, setError),
    });
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
          {t('auth.change_email.title')}
        </Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="new_email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.change_email.new_email_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.new_email}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.new_email}>
            {errors.new_email?.message}
          </HelperText>
        </View>

        <View style={styles.fieldGroup}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('auth.change_email.password_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.password}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword((p) => !p)}
                  />
                }
                style={styles.input}
              />
            )}
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password?.message}
          </HelperText>
        </View>

        <Button
          mode="contained"
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
          loading={mutation.isPending}
          disabled={mutation.isPending}
          contentStyle={styles.submitContent}
          style={styles.submitBtn}
        >
          {t('auth.change_email.submit')}
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
  fieldGroup: { marginBottom: 4 },
  input: { fontSize: 16 },
  submitBtn: { marginTop: 16, borderRadius: 12 },
  submitContent: { height: 52 },
});
