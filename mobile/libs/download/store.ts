import { create } from 'zustand';

export interface DownloadItem {
  id: string;
  artifactId: number;
  fileName: string;
  url: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  error?: string;
  fileUri?: string;
  createdAt: number;
}

interface DownloadState {
  items: DownloadItem[];
}

interface DownloadActions {
  upsert: (item: DownloadItem) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadState & DownloadActions>((set) => ({
  items: [],
  upsert: (item) =>
    set((state) => ({
      items: state.items.some((i) => i.id === item.id)
        ? state.items.map((i) => (i.id === item.id ? item : i))
        : [item, ...state.items],
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter((i) => i.status !== 'completed'),
    })),
}));
