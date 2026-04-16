import * as DocumentPicker from 'expo-document-picker';

export type PickedDocument = DocumentPicker.DocumentPickerAsset;
export interface UploadableAsset {
  uri: string;
  name: string;
  type: string;
}

export class Filesystem {
  public static formatBytes(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const base = 1024;

    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, unitIndex);

    const formatted =
      unitIndex === 0 ? Math.round(value).toString() : value.toFixed(value >= 10 ? 1 : 2);

    return `${formatted} ${units[unitIndex]}`;
  }

  public static getFileName(doc: PickedDocument): string {
    return doc.name ?? 'file';
  }

  public static getMimeType(doc: PickedDocument): string {
    return doc.mimeType ?? 'application/octet-stream';
  }

  public static isImage(doc: PickedDocument): boolean {
    const mime = (doc.mimeType ?? '').toLowerCase();
    if (mime.startsWith('image/')) return true;

    const name = (doc.name ?? '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|heic|heif|tiff)$/.test(name);
  }

  public static truncateMiddle(text: string, maxLength: number): string {
    if (maxLength <= 0) return '';
    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return text.slice(0, maxLength);

    const keep = maxLength - 3;
    const start = Math.ceil(keep / 2);
    const end = Math.floor(keep / 2);

    return `${text.slice(0, start)}...${text.slice(text.length - end)}`;
  }

  public static prepareFileForUpload(
    uri: string | undefined,
    defaultName: string,
  ): UploadableAsset | undefined {
    if (!uri) return undefined;
    const filename = uri.split('/').pop() || defaultName;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;
    return {
      uri,
      name: filename,
      type: type === 'image/pdf' ? 'application/pdf' : type,
    };
  }
}
