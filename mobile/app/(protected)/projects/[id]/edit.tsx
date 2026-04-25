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
import { useProject, useUpdateProject } from '@/modules/projects/api/hooks';
import { ProjectUpdateParams, ProjectUpdateParamsSchema } from '@/modules/projects/api/schemas';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const { t } = useTranslation();

  const { data: project, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ProjectUpdateParams>({
    resolver: zodResolver(ProjectUpdateParamsSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (project) {
      if (project.role !== 'ADMIN') {
        toast.error("Vous n'avez pas les droits pour modifier ce projet.");
        router.back();
        return;
      }

      reset({
        title: project.title,
        description: project.description || '',
      });
    }
  }, [project, reset]);

  const onSubmit = (data: ProjectUpdateParams) => {
    updateProject.mutate(
      { id: projectId, params: data },
      {
        onSuccess: () => {
          toast.success(t('screens.edit_project.success'));
          router.back();
        },
        onError: (error: AppError) => {
          const handled = setFormErrors(error, setError);
          if (!handled) {
            toast.error(t('common.error'), error.message || t('screens.edit_project.error'));
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
          {t('screens.edit_project.title')}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('screens.edit_project.subtitle')}
        </Text>
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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
            onPress={() => {
              void handleSubmit(onSubmit)();
            }}
            loading={updateProject.isPending}
            disabled={updateProject.isPending}
            style={styles.button}
          >
            {t('screens.edit_project.submit')}
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
