import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ProjectCreateParams, ProjectCreateParamsSchema } from '@/modules/projects/api/schemas';
import { useCreateProject } from '@/modules/projects/hooks/useProjects';

export default function CreateProjectScreen() {
  const theme = useTheme();
  const createProject = useCreateProject();

  const {
    control,
    handleSubmit,
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
          text1: 'Projet créé !',
        });
        router.back();
      },
      onError: (error: any) => {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: error.message || 'Impossible de créer le projet.',
        });
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Nouveau Projet
        </Text>
        <Text variant="bodyMedium">
          Organisez vos applications dans un espace dédié.
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nom du projet"
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
                label="Description (optionnelle)"
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
            onPress={handleSubmit(onSubmit)}
            loading={createProject.isPending}
            disabled={createProject.isPending}
            style={styles.button}
          >
            Créer le projet
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.cancel}
          >
            Annuler
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
