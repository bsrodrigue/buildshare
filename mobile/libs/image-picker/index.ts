import ImagePicker, { Options } from 'react-native-image-crop-picker';

import type { Theme } from '@/modules/shared/theme';

export interface ImagePickerResult {
  path: string;
  size: number;
  width: number;
  height: number;
  mime: string;
}

export class ImagePickerService {
  private static getDefaultOptions(theme: Theme): Options {
    return {
      compressImageQuality: 0.8,
      mediaType: 'photo',
      cropperActiveWidgetColor: theme.colors.accent,
      cropperToolbarColor: theme.colors.background,
      cropperToolbarTitle: 'Recadrer',
      cropperToolbarWidgetColor: theme.colors.accent,
      cropperCancelText: 'Annuler',
      cropperChooseText: 'Choisir',
      avoidEmptySpaceAroundImage: true,
      freeStyleCropEnabled: false,
      loadingLabelText: 'Chargement...',
    };
  }

  static async openCamera(theme: Theme, circular = false): Promise<ImagePickerResult | null> {
    try {
      const result = await ImagePicker.openCamera({
        ...this.getDefaultOptions(theme),
        width: 1000,
        height: 1000,
        cropping: true,
        cropperCircleOverlay: circular,
      } as Options);

      return {
        path: result.path,
        size: result.size,
        width: result.width,
        height: result.height,
        mime: result.mime,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('cancelled')) return null;
      throw error;
    }
  }

  static async openPicker(theme: Theme, circular = false): Promise<ImagePickerResult | null> {
    try {
      const result = await ImagePicker.openPicker({
        ...this.getDefaultOptions(theme),
        width: 1000,
        height: 1000,
        cropping: true,
        cropperCircleOverlay: circular,
      } as Options);

      return {
        path: result.path,
        size: result.size,
        width: result.width,
        height: result.height,
        mime: result.mime,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('cancelled')) return null;
      throw error;
    }
  }

  static async openMultiple(theme: Theme, maxFiles = 5): Promise<ImagePickerResult[]> {
    try {
      const results = await ImagePicker.openPicker({
        ...this.getDefaultOptions(theme),
        multiple: true,
        maxFiles,
      } as Options);

      if (Array.isArray(results)) {
        return results.map((result) => ({
          path: result.path,
          size: result.size,
          width: result.width,
          height: result.height,
          mime: result.mime,
        }));
      }
      return [];
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('cancelled')) return [];
      throw error;
    }
  }

  static clean() {
    return ImagePicker.clean();
  }
}
