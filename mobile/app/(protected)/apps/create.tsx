import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, IconButton } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ApplicationCreateParams, ApplicationCreateParamsSchema } from '@/modules/binaries/api/schemas';
import { useCreateApplication } from '@/modules/binaries/api/hooks';
import { setFormErrors } from '@/libs/api/forms';

export default function CreateApplicationScreen() {
  const { projectId } = useLocalSearchParams();
  const theme = useTheme();
  const createApplication = useCreateApplication();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplicationCreateParams>({
    resolver: zodResolver(ApplicationCreateParamsSchema),
    defaultValues: {
      project_id: parseInt(projectId as string, 10),
      app_id: '',
      title: '',
      description: '',
    },
  });

  const onSubmit = (data: ApplicationCreateParams) => {
    createApplication.mutate(data, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Application créée !',
        });
        router.back();
      },
      onError: (error: any) => {
        const handled = setFormErrors(error, setError);
        if (!handled) {
          Toast.show({
            type: 'error',
            text1: 'Erreur',
            text2: error.message || "Impossible de créer l'application.",
          });
        }
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          Nouvelle Application
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nom de l'application"
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
            name="app_id"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="ID de bundle (ex: com.app.android)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.app_id}
                mode="outlined"
                autoCapitalize="none"
                style={styles.input}
              />
            )}
          />
          {errors.app_id && (
            <Text style={{ color: theme.colors.error }} variant="bodySmall">
              {errors.app_id.message}
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
                numberOfLines={3}
                style={styles.input}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={createApplication.isPending}
            disabled={createApplication.isPending}
            style={styles.button}
          >
            Créer l'application
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
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  card: {
    margin: 20,
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
});
