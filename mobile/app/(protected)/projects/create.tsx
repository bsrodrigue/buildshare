import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { Controller,useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView,StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { useCreateProject } from '@/modules/projects/api/hooks';
import { ProjectCreateParams, ProjectCreateParamsSchema } from '@/modules/projects/api/schemas';

export default function CreateProjectScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const createProject = useCreateProject();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProjectCreateParams>({
    resolver: zodResolver(ProjectCreateParamsSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = (data: ProjectCreateParams) => {
    createProject.mutate(data, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: t('screens.create_project.success'),
        });
        router.back();
      },
      onError: (error: AppError) => {
        const handled = setFormErrors(error, setError);
        if (!handled) {
          Toast.show({
            type: 'error',
            text1: t('common.error'),
            text2: error.message || t('screens.create_project.error'),
          });
        }
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('screens.create_project.title')}
        </Text>
        <Text variant="bodyMedium">
          {t('screens.create_project.subtitle')}
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t('screens.create_project.name_label')}
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
                label={t('screens.create_project.description_label')}
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
            onPress={() => { void handleSubmit(onSubmit)(); }}
            loading={createProject.isPending}
            disabled={createProject.isPending}
            style={styles.button}
          >
            {t('screens.create_project.submit')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.cancel}
          >
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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff',
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
});
