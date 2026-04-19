import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { ImagePickerService } from '@/libs/image-picker';
import { useTheme } from '@/modules/shared/theme';

export const useFilePicker = () => {
  const theme = useTheme();
  const [files, setFiles] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const pickDocument = useCallback(async (field: string) => {
    setLoading((prev) => ({ ...prev, [field]: true }));
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setFiles((prev) => ({ ...prev, [field]: result.assets[0].uri }));
        Alert.alert('Succès', 'Document téléversé avec succès');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    } finally {
      setLoading((prev) => ({ ...prev, [field]: false }));
    }
  }, []);

  const pickImage = useCallback(
    async (field: string) => {
      setLoading((prev) => ({ ...prev, [field]: true }));
      try {
        const result = await ImagePickerService.openPicker(theme, true);

        if (result) {
          if (result.size > 5 * 1024 * 1024) {
            Alert.alert('Erreur', "L'image doit faire moins de 5 Mo");
            setLoading((prev) => ({ ...prev, [field]: false }));
            return;
          }
          setFiles((prev) => ({ ...prev, [field]: result.path }));
          Alert.alert('Succès', 'Image téléversée avec succès');
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('cancelled')) return;
        Alert.alert('Erreur', "Impossible de sélectionner l'image");
      } finally {
        setLoading((prev) => ({ ...prev, [field]: false }));
      }
    },
    [theme],
  );

  return {
    files,
    pickDocument,
    pickImage,
    loading,
  };
};
