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
  ProgressBar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import Toast from 'react-native-toast-message';

import { AppError } from '@/libs/api/types';
import { useAPKUploadPipeline } from '@/modules/binaries/api/hooks';

export default function UploadArtifactScreen() {
  const { id } = useLocalSearchParams();
  const pid = parseInt(id as string, 10);
  const theme = useTheme();
  
  const uploadPipeline = useAPKUploadPipeline();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

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

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.android.package-archive',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Échec de la sélection',
      });
    }
  };

  const onSubmit = (data: { title: string; description: string }) => {
    if (!selectedFile) {
      Toast.show({
        type: 'error',
        text1: 'Fichier manquant',
        text2: 'Veuillez sélectionner un fichier APK.',
      });
      return;
    }

    if (!pid) {
      Toast.show({
        type: 'error',
        text1: 'Paramètre manquant',
        text2: 'ID du projet introuvable.',
      });
      return;
    }

    uploadPipeline.mutate(
      {
        projectId: pid,
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/vnd.android.package-archive',
        },
        title: data.title.trim() || undefined,
        description: data.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (error: AppError) => {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          Propulser un APK
        </Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <Surface style={styles.uploadArea} elevation={selectedFile ? 1 : 0}>
          <IconButton
            icon={selectedFile ? 'check-circle' : 'cloud-upload'}
            size={48}
            iconColor={selectedFile ? theme.colors.primary : theme.colors.outline}
          />
          <Text variant="bodyLarge" style={styles.uploadText}>
            {selectedFile ? selectedFile.name : 'Sélectionnez votre binaire Android'}
          </Text>
          <Button
            mode={selectedFile ? 'text' : 'contained'}
            onPress={() => { void pickFile(); }}
            style={styles.pickButton}
            disabled={isPending}
          >
            {selectedFile ? 'Changer de fichier' : 'Parcourir'}
          </Button>
          {selectedFile && (
            <Text variant="bodySmall" style={styles.fileSize}>
              {Math.round((selectedFile.size ?? 0) / (1024 * 1024))} Mo • APK
            </Text>
          )}
        </Surface>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Détails de la Release
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
                  label="Description / Notes"
                  placeholder="Quoi de neuf dans cette version ?"
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

            {isPending && (
              <View style={styles.progressContainer}>
                <Text variant="bodySmall" style={styles.progressText}>
                  Téléversement vers Cloudflare R2...
                </Text>
                <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
              </View>
            )}

            <Button
              mode="contained"
              onPress={() => { void handleSubmit(onSubmit)(); }}
              loading={isPending}
              disabled={isPending || !selectedFile}
              contentStyle={styles.submitButtonContent}
              style={styles.submitButton}
            >
              Lancer le déploiement
            </Button>
          </Card.Content>
        </Card>

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
    paddingTop: 60,
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
  uploadArea: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    marginBottom: 24,
  },
  uploadText: {
    textAlign: 'center',
    marginVertical: 12,
    fontWeight: '500',
  },
  pickButton: {
    marginTop: 8,
  },
  fileSize: {
    marginTop: 8,
    opacity: 0.5,
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
  progressContainer: {
    marginVertical: 16,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
  },
  submitButtonContent: {
    height: 48,
  },
});
