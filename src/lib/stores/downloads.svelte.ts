import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { historyStore } from './history.svelte.js';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: string;
  format: string;
  quality: string;
  outputPath: string;
  status: 'queued' | 'downloading' | 'processing' | 'complete' | 'error' | 'cancelled';
  percent: number;
  speed: string;
  eta: string;
  downloadedBytes: number;
  totalBytes: number;
  currentTitle: string;
  // Playlist
  isPlaylist: boolean;
  playlistTotal: number;
  playlistCurrent: number;
  errorMessage?: string;
  addedAt: number;
}

interface ProgressEvent {
  id: string;
  percent: number;
  speed: string;
  eta: string;
  downloaded_bytes: number;
  total_bytes: number;
  current_title: string;
  status: string;
}

interface PlaylistProgressEvent {
  id: string;
  current_index: number;
  total_count: number;
  current_title: string;
}

function createDownloadStore() {
  let items = $state<DownloadItem[]>([]);
  let unlistenProgress: UnlistenFn | null = null;
  let unlistenPlaylist: UnlistenFn | null = null;
  let unlistenCancelled: UnlistenFn | null = null;

  async function init() {
    if (unlistenProgress) return; // Guard: don't double-register listeners
    unlistenProgress = await listen<ProgressEvent>('download:progress', async ({ payload }) => {
      const idx = items.findIndex(i => i.id === payload.id);
      if (idx === -1) return;
      
      const wasComplete = items[idx].status === 'complete';
      
      items[idx] = {
        ...items[idx],
        percent: payload.percent,
        speed: payload.speed,
        eta: payload.eta,
        downloadedBytes: payload.downloaded_bytes,
        totalBytes: payload.total_bytes,
        currentTitle: payload.current_title || items[idx].currentTitle,
        status: payload.status as DownloadItem['status'],
        errorMessage: payload.status === 'error' ? payload.current_title : undefined,
      };

      // Add to history if newly completed
      if (payload.status === 'complete' && !wasComplete) {
        const item = items[idx];
        try {
          await historyStore.addItem({
            id: item.id,
            url: item.url,
            title: item.currentTitle || item.title,
            thumbnail: item.thumbnail,
            platform: item.platform,
            format: item.format,
            quality: item.quality,
            outputPath: item.outputPath,
            filePath: '',
            fileSize: item.totalBytes || item.downloadedBytes,
            downloadedAt: Date.now(),
            isPlaylist: item.isPlaylist,
            playlistTotal: item.playlistTotal,
          });
        } catch (e) {
          console.error('Failed to save to history:', e);
        }
      }
    });

    unlistenPlaylist = await listen<PlaylistProgressEvent>('download:playlist-progress', ({ payload }) => {
      const idx = items.findIndex(i => i.id === payload.id);
      if (idx === -1) return;
      items[idx] = {
        ...items[idx],
        playlistCurrent: payload.current_index,
        playlistTotal: payload.total_count > 0 ? payload.total_count : items[idx].playlistTotal,
        currentTitle: payload.current_title || items[idx].currentTitle,
      };
    });

    unlistenCancelled = await listen<{ id: string }>('download:cancelled', ({ payload }) => {
      const idx = items.findIndex(i => i.id === payload.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], status: 'cancelled' };
      }
    });
  }

  function addItem(item: DownloadItem) {
    items = [...items, item];
  }

  function removeItem(id: string) {
    items = items.filter(i => i.id !== id);
  }

  async function cancelDownload(id: string) {
    try {
      await invoke('cancel_download', { downloadId: id });
    } catch (e) {
      console.error('Cancel failed:', e);
    }
  }

  function cleanup() {
    unlistenProgress?.();
    unlistenPlaylist?.();
    unlistenCancelled?.();
  }

  return {
    get items() { return items; },
    get activeCount() { return items.filter(i => i.status === 'downloading' || i.status === 'processing').length; },
    get queuedCount() { return items.filter(i => i.status === 'queued').length; },
    init,
    addItem,
    removeItem,
    cancelDownload,
    cleanup,
  };
}

export const downloadStore = createDownloadStore();
