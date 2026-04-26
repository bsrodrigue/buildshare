import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Text } from 'react-native-paper';

import { useCreateBug } from '@/modules/binaries/api/hooks';
import { Release } from '@/modules/binaries/api/schemas';
import { useTheme } from '@/modules/shared/theme/ThemeProvider';

interface BugCreationSheetProps {
  release: Release | null;
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
}

export function BugCreationSheet({
  release,
  visible,
  onDismiss,
  onSuccess,
}: BugCreationSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const [description, setDescription] = useState('');

  const createBug = useCreateBug();

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setDescription('');
    onDismiss();
  }, [onDismiss]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const handleSubmit = () => {
    if (!release || !description.trim()) return;

    createBug.mutate(
      {
        releaseId: release.id,
        params: { description: description.trim() },
      },
      {
        onSuccess: () => {
          handleDismiss();
          onSuccess();
        },
      },
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: theme.colors.onSurfaceVariant },
      ]}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.flex1}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              {t('screens.bugs.creation_title')}
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => bottomSheetModalRef.current?.dismiss()}
            />
          </View>

          <Divider />

          <View style={styles.form}>
            <Text variant="labelMedium" style={styles.label}>
              {t('screens.bugs.creation_description_label')}
            </Text>
            <BottomSheetTextInput
              placeholder={t('screens.bugs.creation_description_placeholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={10}
              style={[
                styles.input,
                styles.textArea,
                {
                  color: theme.colors.onSurface,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            />
          </View>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={createBug.isPending}
              disabled={!description.trim() || createBug.isPending}
              style={styles.button}
            >
              {t('screens.bugs.submit_report')}
            </Button>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    fontWeight: '700',
  },
  form: {
    padding: 24,
    flex: 1,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  button: {
    borderRadius: 8,
  },
  handleIndicator: {
    opacity: 0.4,
  },
  flex1: {
    flex: 1,
  },
});
