import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
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
import { useCreateProject } from '@/modules/projects/api/hooks';
import { ProjectCreateParams, ProjectCreateParamsSchema } from '@/modules/projects/api/schemas';

export default function CreateProjectScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
        toast.success(t('screens.create_project.success'));
        router.back();
      },
      onError: (error: AppError) => {
        const handled = setFormErrors(error, setError);
        if (!handled) {
          toast.error(t('common.error'), error.message || t('screens.create_project.error'));
        }
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ── */}
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
            {t('screens.create_project.title')}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.pageSubtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('screens.create_project.subtitle')}
          </Text>
        </View>
      </View>

      {/* ── Form ── */}
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
          loading={createProject.isPending}
          disabled={createProject.isPending}
          style={styles.submitBtn}
        >
          {t('screens.create_project.submit')}
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
});
