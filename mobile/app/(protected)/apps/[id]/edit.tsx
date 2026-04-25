import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text, TextInput, useTheme } from 'react-native-paper';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';
import { useApplication, useUpdateApplication } from '@/modules/binaries/api/hooks';
import {
  ApplicationUpdateParams,
  ApplicationUpdateParamsSchema,
} from '@/modules/binaries/api/schemas';

export default function EditAppScreen() {
  const { id } = useLocalSearchParams();
  const applicationId = parseInt(id as string, 10);
  const theme = useTheme();
  const { t } = useTranslation();

  const { data: application, isLoading } = useApplication(applicationId);
  const updateApplication = useUpdateApplication();

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ApplicationUpdateParams>({
    resolver: zodResolver(ApplicationUpdateParamsSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (application) {
      if (application.project_role !== 'ADMIN') {
        toast.error("Vous n'avez pas les droits pour modifier cette application.");
        router.back();
        return;
      }

      reset({
        title: application.title,
        description: application.description || '',
      });
    }
  }, [application, reset]);

  const onSubmit = (data: ApplicationUpdateParams) => {
    updateApplication.mutate(
      { id: applicationId, params: data },
      {
        onSuccess: () => {
          toast.success(t('screens.edit_application.success'));
          router.back();
        },
        onError: (error: AppError) => {
          const handled = setFormErrors(error, setError);
          if (!handled) {
            toast.error(t('common.error'), error.message || t('screens.edit_application.error'));
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          {t('screens.edit_application.title')}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('screens.edit_application.subtitle')}
        </Text>
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('screens.upload.app_name_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.title}
                mode="outlined"
                style={styles.input}
              />
            )}
          />
          {errors.title && (
            <Text style={{ color: theme.colors.error }} variant="bodySmall">
              {errors.title.message}
            </Text>
          )}

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('screens.upload.description_label')}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={() => {
              void handleSubmit(onSubmit)();
            }}
            loading={updateApplication.isPending}
            disabled={updateApplication.isPending}
            style={styles.button}
          >
            {t('screens.edit_application.submit')}
          </Button>

          <Button mode="outlined" onPress={() => router.back()} style={styles.cancel}>
            {t('common.cancel')}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
  },
  card: {
    elevation: 2,
    borderRadius: 12,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  cancel: {
    marginTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
