import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setFormErrors } from '@/libs/api/forms';
import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';
import { useProject, useUpdateProject } from '@/modules/projects/api/hooks';
import { ProjectUpdateParams, ProjectUpdateParamsSchema } from '@/modules/projects/api/schemas';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams();
  const projectId = parseInt(id as string, 10);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            paddingTop: insets.top + 8,
            borderBottomColor: theme.colors.outline + '20',
          },
        ]}
      >
        <IconButton
          icon="arrow-left"
          iconColor={theme.colors.onSurface}
          size={28}
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text variant="headlineSmall" style={[styles.pageTitle, { color: theme.colors.onSurface }]}>
            {t('screens.edit_project.title')}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.pageSubtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('screens.edit_project.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fieldGroup}>
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
          <HelperText type="error" visible={!!errors.title}>
            {errors.title?.message}
          </HelperText>
        </View>

        <View style={styles.fieldGroup}>
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
        </View>

        <Button
          mode="contained"
          onPress={() => {
            void handleSubmit(onSubmit)();
          }}
          loading={updateProject.isPending}
          disabled={updateProject.isPending}
          style={styles.submitBtn}
        >
          {t('screens.edit_project.submit')}
        </Button>

        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.cancelBtn}
        >
          {t('common.cancel')}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  backButton: {
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  pageTitle: {
    fontWeight: 'bold',
  },
  pageSubtitle: {
    opacity: 0.6,
  },
  listContent: {
    padding: 16,
  },
  fieldGroup: { marginBottom: 8 },
  input: { fontSize: 16 },
  submitBtn: {
    marginTop: 12,
    borderRadius: 28,
  },
  cancelBtn: { marginTop: 12 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
