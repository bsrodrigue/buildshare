import { randomUUID } from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { http } from '@/libs/api/client';
import { Logger } from '@/libs/log';

import { DownloadItem, useDownloadStore } from './store';

const logger = new Logger('DownloadService');

function createItem(artifactId: number, fileName: string, url: string): DownloadItem {
  return {
    id: randomUUID(),
    artifactId,
    fileName,
    url,
    status: 'pending',
    progress: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    createdAt: Date.now(),
  };
}

async function ensureDir(): Promise<string> {
  const dir = FileSystem.documentDirectory + 'downloads/';
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function localUri(fileName: string): Promise<string> {
  const dir = await ensureDir();
  return dir + fileName;
}

export class DownloadService {
  static async start(artifactId: number, fileName: string, url: string): Promise<void> {
    const item = createItem(artifactId, fileName, url);
    useDownloadStore.getState().upsert(item);
    await this.resume(item.id);
  }

  static async resume(id: string): Promise<void> {
    const store = useDownloadStore.getState();
    const item = store.items.find((i) => i.id === id);
    if (!item) return;

    const dest = await localUri(item.fileName);
    store.upsert({ ...item, status: 'downloading', error: undefined });

    try {
      logger.debug(`Fetching presigned URL from: ${item.url}`);
      const data = await http.get<{ url: string }>(item.url);
      logger.debug(`Got presigned URL: ${data.url.substring(0, 80)}...`);

      const result = await FileSystem.downloadAsync(data.url, dest, undefined);

      useDownloadStore.getState().upsert({
        ...item,
        status: 'completed',
        progress: 1,
        fileUri: result.uri,
      });

      logger.info(`Download complete: ${item.fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Download failed: ${item.fileName} - ${message}`);
      useDownloadStore.getState().upsert({
        ...item,
        status: 'failed',
        error: message,
      });
    }
  }

  static async pause(_id: string): Promise<void> {
    logger.warn('Pause not supported with direct download');
  }

  static async retry(id: string): Promise<void> {
    await this.resume(id);
  }

  static cancel(id: string): void {
    useDownloadStore.getState().remove(id);
  }
}
