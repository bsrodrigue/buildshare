import * as DocumentPicker from 'expo-document-picker';
import { router,useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller,useForm } from 'react-hook-form';
import { ScrollView,StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  IconButton,
  List,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AppError } from '@/libs/api/types';
import { useAPKUploadPipeline } from '@/modules/binaries/api/hooks';
import { ApkUploadInput } from '@/modules/binaries/components/ApkUploadInput';

export default function UploadArtifactScreen() {
  const { id, appId } = useLocalSearchParams();
  const pid = parseInt(id as string, 10);
  const isReleaseMode = !!appId;
  const insets = useSafeAreaInsets();
  
  const uploadPipeline = useAPKUploadPipeline();
  
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    control,
    handleSubmit,
    formState: _unused,
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = (data: { title: string; description: string }) => {
    if (!selectedFile) {
      Toast.show({
        type: 'error',
        text1: 'Fichier manquant',
        text2: 'Veuillez sélectionner un fichier APK.',
      });
      return;
    }

    setUploadProgress(0);
    uploadPipeline.mutate(
      {
        projectId: pid,
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/vnd.android.package-archive',
        },
        title: isReleaseMode ? undefined : (data.title.trim() || undefined),
        description: isReleaseMode ? undefined : (data.description.trim() || undefined),
        onProgress: (p) => setUploadProgress(p),
      },
      {
        onSuccess: () => {
          router.push('/(protected)/activity');
        },
        onError: (error: AppError) => {
          setUploadProgress(0);
          Toast.show({
            type: 'error',
            text1: 'Erreur de téléversement',
            text2: error.message,
          });
        },
      }
    );
  };

  const isPending = uploadPipeline.isPending;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          {isReleaseMode ? 'Nouvelle Release' : 'Nouvelle Application'}
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <ApkUploadInput 
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          isUploading={isPending}
          progress={uploadProgress}
        />

        {!isReleaseMode && (
          <Card style={styles.formCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Détails de l&apos;Application
              </Text>
              
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Nom de l'application (optionnel)"
                    placeholder="ex: Mon Super Projet"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    disabled={isPending}
                  />
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Description"
                    placeholder="Brève description du projet"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={styles.input}
                    disabled={isPending}
                  />
                )}
              />
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={() => { void handleSubmit(onSubmit)(); }}
          loading={isPending}
          disabled={isPending || !selectedFile}
          contentStyle={styles.submitButtonContent}
          style={styles.submitButton}
        >
          {isReleaseMode ? 'Lancer la mise à jour' : 'Lancer le déploiement'}
        </Button>

        <List.Section>
          <List.Subheader>Information</List.Subheader>
          <List.Item
            title="Traitement asynchrone"
            description="Le serveur extraira automatiquement les métadonnées de l'APK (ID, Version)."
            left={props => <List.Icon {...props} icon="information-outline" />}
          />
        </List.Section>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  spacer: { width: 48 },
  title: {
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
  },
  formCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 0,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  submitButtonContent: {
    height: 48,
  },
});
