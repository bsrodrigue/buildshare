import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  List,
  Text,
  TextInput,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/libs/api/types';
import { toast } from '@/libs/notification/toast';
import { ConflictResolutionSheet } from '@/modules/binaries/components/ConflictResolutionSheet';
import { useAPKUploadAnalysis, useProcessAPK } from '@/modules/binaries/api/hooks';
import { AnalysisResult, Resolution } from '@/modules/binaries/api/schemas';
import { ApkUploadInput } from '@/modules/binaries/components/ApkUploadInput';
import { useProject } from '@/modules/projects/api/hooks';

export default function UploadArtifactScreen() {
  const { id, appId } = useLocalSearchParams();
  const pid = parseInt(id as string, 10);
  const isReleaseMode = !!appId;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data: project, isLoading: isProjectLoading } = useProject(pid);
  const uploadAnalysis = useAPKUploadAnalysis();
  const processAPK = useProcessAPK();

  React.useEffect(() => {
    if (project && project.role !== 'ADMIN') {
      toast.error('Seuls les administrateurs peuvent ajouter des fichiers.');
      router.back();
    }
  }, [project]);

  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showResolutionSheet, setShowResolutionSheet] = useState(false);

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

  const handleFileSelect = (file: DocumentPicker.DocumentPickerAsset | null) => {
    setSelectedFile(file);
  };

  const handleProcess = async (
    analysis: AnalysisResult,
    jobId: string,
    title?: string,
    description?: string,
    resolution?: Resolution,
  ) => {
    await processAPK.mutateAsync(
      {
        jobId,
        title: isReleaseMode ? undefined : title?.trim() || undefined,
        description: isReleaseMode ? undefined : description?.trim() || undefined,
        resolution,
        projectId: pid,
      },
      {
        onSuccess: () => {
          toast.success(
            t('screens.upload.upload_success'),
            t('screens.upload.upload_success_desc'),
          );
          router.replace('/(protected)/activity');
        },
        onError: (error: AppError) => {
          toast.error(t('screens.upload.upload_error'), error.message);
        },
      },
    );
  };

  const onSubmit = async (data: { title: string; description: string }) => {
    if (!selectedFile) {
      toast.error(t('screens.upload.file_missing'), t('screens.upload.file_missing_desc'));
      return;
    }

    setUploadProgress(0);
    setAnalysisResult(null);

    try {
      const { analysis, jobId } = await uploadAnalysis.mutateAsync({
        projectId: pid,
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || 'application/vnd.android.package-archive',
        },
        onProgress: (p) => setUploadProgress(p),
      });

      setAnalysisResult(analysis);

      const decisions = analysis.decisions_needed ?? [];
      if (decisions.length > 0) {
        setShowResolutionSheet(true);
      } else {
        await handleProcess(analysis, jobId, data.title, data.description);
      }
    } catch (error) {
      setUploadProgress(0);
      const appError = error as AppError;
      toast.error(t('screens.upload.upload_error'), appError.message);
    }
  };

  const handleResolve = async (resolution: Resolution) => {
    setShowResolutionSheet(false);
    if (analysisResult) {
      const jobId = analysisResult.job_id;
      const { title, description } = control._formValues;
      try {
        await handleProcess(analysisResult, jobId, title, description, resolution);
      } catch {
        // error handled in handleProcess
      }
    }
  };

  const isPending = uploadAnalysis.isPending || processAPK.isPending;

  if (isProjectLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="headlineSmall" style={styles.title}>
          {isReleaseMode
            ? t('screens.upload.title_new_release')
            : t('screens.upload.title_new_app')}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.body}>
          <ApkUploadInput
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            isUploading={isPending}
            progress={uploadProgress}
          />

          {!isReleaseMode && !showDetails && (
            <Button
              mode="text"
              icon="plus"
              onPress={() => setShowDetails(true)}
              style={styles.addDetailsBtn}
            >
              {t('screens.upload.add_details')}
            </Button>
          )}

          {!isReleaseMode && showDetails && (
            <Card style={styles.formCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t('screens.upload.app_details_title')}
                  </Text>
                  <IconButton icon="close" size={20} onPress={() => setShowDetails(false)} />
                </View>

                <Controller
                  control={control}
                  name="title"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label={t('screens.upload.app_name_label')}
                      placeholder={t('screens.upload.app_name_placeholder')}
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
                      label={t('screens.upload.description_label')}
                      placeholder={t('screens.upload.description_placeholder')}
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
            onPress={() => {
              void handleSubmit(onSubmit)();
            }}
            loading={isPending}
            disabled={isPending || !selectedFile}
            contentStyle={styles.submitButtonContent}
            style={styles.submitButton}
          >
            {isReleaseMode ? t('screens.upload.submit_release') : t('screens.upload.submit_app')}
          </Button>

          <List.Section>
            <List.Subheader>{t('screens.upload.info_header')}</List.Subheader>
            <List.Item
              title={t('screens.upload.async_info_title')}
              description={t('screens.upload.async_info_desc')}
              left={(props) => <List.Icon {...props} icon="information-outline" />}
            />
          </List.Section>
        </View>
      </ScrollView>

      {showResolutionSheet && analysisResult && (
        <ConflictResolutionSheet
          analysis={analysisResult}
          onResolve={handleResolve}
          onDismiss={() => setShowResolutionSheet(false)}
          isProcessing={processAPK.isPending}
        />
      )}
    </View>
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
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  addDetailsBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    borderRadius: 12,
  },
  submitButtonContent: {
    height: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
