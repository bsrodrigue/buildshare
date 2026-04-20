import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, ProgressBar, Surface, Text, useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { toast } from '@/libs/notification/toast';

interface ApkUploadInputProps {
  onFileSelect: (file: DocumentPicker.DocumentPickerAsset | null) => void;
  selectedFile: DocumentPicker.DocumentPickerAsset | null;
  isUploading: boolean;
  progress: number;
  disabled?: boolean;
}

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

export const ApkUploadInput: React.FC<ApkUploadInputProps> = ({
  onFileSelect,
  selectedFile,
  isUploading,
  progress,
  disabled,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const isInteractionDisabled = disabled || isUploading;

  // Clamp progress to prevent the 200% overflow reported by the user
  const displayProgress = Math.min(100, Math.max(0, progress));

  const pickFile = async () => {
    if (isInteractionDisabled) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.android.package-archive',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFileSelect(result.assets[0]);
        // Simple entry animation
        scale.value = withSpring(1.05, {}, () => {
          scale.value = withSpring(1);
        });
      }
    } catch {
      toast.error(t('components.apk_input.selection_failed'));
    }
  };

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: selectedFile ? theme.colors.primary : theme.colors.outlineVariant,
    opacity: isInteractionDisabled ? 0.6 : 1,
  }));

  const iconCircleStyle = React.useMemo(
    () => [
      styles.iconCircle,
      { backgroundColor: selectedFile ? theme.colors.primaryContainer : '#f5f5f5' },
    ],
    [selectedFile, theme.colors.primaryContainer],
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          void pickFile();
        }}
        disabled={isInteractionDisabled}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <AnimatedSurface
          style={[
            styles.uploadArea,
            animatedStyles,
            selectedFile ? styles.selectedBorder : styles.unselectedBorder,
          ]}
          elevation={selectedFile ? 1 : 0}
        >
          <View style={styles.content}>
            <View style={iconCircleStyle}>
              {selectedFile ? (
                <IconButton icon="check-circle" size={40} iconColor={theme.colors.primary} />
              ) : (
                <MaterialCommunityIcons
                  name="android"
                  size={48}
                  color={isInteractionDisabled ? theme.colors.outlineVariant : theme.colors.outline}
                />
              )}
            </View>

            <Text variant="titleMedium" style={styles.uploadText}>
              {selectedFile ? selectedFile.name : t('components.apk_input.drop_zone_empty')}
            </Text>

            {!isUploading && (
              <Button
                mode={selectedFile ? 'text' : 'contained'}
                onPress={() => {
                  void pickFile();
                }}
                style={styles.pickButton}
                disabled={isInteractionDisabled}
                contentStyle={styles.buttonContent}
              >
                {selectedFile
                  ? t('components.apk_input.change_file')
                  : t('components.apk_input.browse')}
              </Button>
            )}

            {selectedFile && !isUploading && (
              <View style={styles.badge}>
                <Text
                  variant="labelSmall"
                  style={[styles.badgeText, { color: theme.colors.onSurfaceVariant }]}
                >
                  {t('components.apk_input.meta_info', {
                    size: Math.round((selectedFile.size ?? 0) / (1024 * 1024)),
                  })}
                </Text>
              </View>
            )}
          </View>

          {isUploading && (
            <View style={styles.progressWrapper}>
              <View style={styles.progressHeader}>
                <Text variant="labelMedium" style={styles.progressLabel}>
                  {progress < 100
                    ? t('components.apk_input.uploading')
                    : t('components.apk_input.processing')}
                </Text>
                <Text variant="labelMedium" style={styles.progressValue}>
                  {Math.round(displayProgress)}%
                </Text>
              </View>
              <ProgressBar
                progress={displayProgress / 100}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          )}
        </AnimatedSurface>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  pressable: {
    borderRadius: 24,
  },
  pressed: {
    opacity: 0.8,
  },
  uploadArea: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#fff',
    minHeight: 200,
  },
  unselectedBorder: {
    borderStyle: 'dashed',
  },
  selectedBorder: {
    borderStyle: 'solid',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  uploadText: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  pickButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingHorizontal: 16,
  },
  badge: {
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  progressWrapper: {
    width: '100%',
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    opacity: 0.6,
  },
  progressValue: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});
