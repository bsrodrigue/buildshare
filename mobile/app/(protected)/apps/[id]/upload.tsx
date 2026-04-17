import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, IconButton } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { ArtifactUploadParams, ArtifactUploadParamsSchema } from '@/modules/binaries/api/schemas';
import { useUploadArtifact } from '@/modules/binaries/api/hooks';
import { setFormErrors } from '@/libs/api/forms';

export default function UploadArtifactScreen() {
  const { id } = useLocalSearchParams();
  const appId = parseInt(id as string, 10);
  const uploadArtifact = useUploadArtifact();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ArtifactUploadParams>({
    resolver: zodResolver(ArtifactUploadParamsSchema),
    defaultValues: {
      application_id: appId,
      version_code: 1,
      version_id: '',
      release_notes: '',
      architecture: 'universal',
    },
  });

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.android.package-archive', // APK
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Échec de la sélection',
      });
    }
  };

  const onSubmit = (data: ArtifactUploadParams) => {
    if (!selectedFile) {
      Toast.show({
        type: 'error',
        text1: 'Fichier manquant',
        text2: 'Veuillez sélectionner un fichier APK.',
      });
      return;
    }

    const payload = {
      ...data,
      file: {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/vnd.android.package-archive',
      },
    };

    uploadArtifact.mutate(payload as any, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Upload réussi !',
        });
        router.back();
      },
      onError: (error: any) => {
        const handled = setFormErrors(error, setError);
        if (!handled) {
          Toast.show({
            type: 'error',
            text1: "Erreur d'upload",
            text2: error.message || "Impossible d'uploader le fichier.",
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
          Nouvelle Release
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Button mode="outlined" icon="upload" onPress={pickFile} style={styles.fileButton}>
            {selectedFile ? `Fichier: ${selectedFile.name}` : 'Choisir un APK'}
          </Button>
          {selectedFile && (
            <Text variant="bodySmall" style={styles.fileInfo}>
              {(selectedFile.size! / (1024 * 1024)).toFixed(2)} Mo
            </Text>
          )}

          <Controller
            control={control}
            name="version_id"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Nom de version (ex: 1.0.0)"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.version_id}
                mode="outlined"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="version_code"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Code de version (ex: 1)"
                value={value.toString()}
                onBlur={onBlur}
                onChangeText={(text) => onChange(parseInt(text, 10) || 0)}
                error={!!errors.version_code}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
            )}
          />

          <Controller
            control={control}
            name="release_notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Notes de version"
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
            loading={uploadArtifact.isPending}
            disabled={uploadArtifact.isPending}
            style={styles.button}
          >
            Uploader la Release
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
  fileButton: {
    marginBottom: 8,
    borderStyle: 'dashed',
  },
  fileInfo: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.6,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
});
