import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, ProgressBar, Surface, Text, useTheme } from 'react-native-paper';
import Animated, { 
  interpolate, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

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
  
  // Animation values
  const pulse = useSharedValue(1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!selectedFile && !isUploading) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [selectedFile, isUploading, pulse]);

  useEffect(() => {
    if (selectedFile) {
      opacity.value = withTiming(1, { duration: 500 });
      scale.value = withSpring(1.1, {}, () => {
        scale.value = withSpring(1);
      });
    } else {
      opacity.value = 0;
    }
  }, [selectedFile, opacity, scale]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.android.package-archive',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFileSelect(result.assets[0]);
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Échec de la sélection',
      });
    }
  };

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: selectedFile ? theme.colors.primary : theme.colors.outlineVariant,
    borderStyle: selectedFile ? 'solid' : 'dashed',
  }));

  const contentStyles = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0.6, 1]),
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <AnimatedSurface style={[styles.uploadArea, animatedStyles]} elevation={selectedFile ? 2 : 0}>
        <LinearGradient
          colors={selectedFile ? [theme.colors.primaryContainer, 'transparent'] : ['#fafafa', 'transparent']}
          style={styles.gradient}
        />
        
        <Animated.View style={[styles.content, contentStyles]}>
          <View style={styles.iconCircle}>
            {selectedFile ? (
               <IconButton
               icon="check-circle"
               size={40}
               iconColor={theme.colors.primary}
             />
            ) : (
              <MaterialCommunityIcons name="android" size={48} color={theme.colors.outline} />
            )}
          </View>

          <Text variant="titleMedium" style={styles.uploadText}>
            {selectedFile ? selectedFile.name : 'Déposez votre binaire APK'}
          </Text>
          
          {!isUploading && (
            <Button
              mode={selectedFile ? 'text' : 'contained'}
              onPress={() => { void pickFile(); }}
              style={styles.pickButton}
              disabled={disabled}
              contentStyle={styles.buttonContent}
            >
              {selectedFile ? 'Changer de fichier' : 'Parcourir les fichiers'}
            </Button>
          )}

          {selectedFile && !isUploading && (
            <View style={styles.badge}>
              <Text variant="labelSmall" style={styles.badgeText}>
                {Math.round((selectedFile.size ?? 0) / (1024 * 1024))} MO • ANDROID
              </Text>
            </View>
          )}
        </Animated.View>

        {isUploading && (
          <View style={styles.progressWrapper}>
            <View style={styles.progressHeader}>
              <Text variant="labelMedium" style={styles.progressLabel}>
                {progress < 100 ? 'Téléversement sécurisé...' : 'Finalisation...'}
              </Text>
              <Text variant="labelMedium" style={styles.progressValue}>
                {Math.round(progress)}%
              </Text>
            </View>
            <ProgressBar 
              progress={progress / 100} 
              color={theme.colors.primary} 
              style={styles.progressBar} 
            />
          </View>
        )}
      </AnimatedSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  uploadArea: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 220,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  uploadText: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  pickButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingHorizontal: 16,
    height: 44,
  },
  badge: {
    marginTop: 12,
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#666',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressWrapper: {
    width: '100%',
    marginTop: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    opacity: 0.6,
  },
  progressValue: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
