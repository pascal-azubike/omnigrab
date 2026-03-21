import { cancelDownload as apiCancelDownload, listenProgress } from '$lib/utils/api';
import type { ProgressEvent } from '$lib/utils/api';
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
  isPlaylist: boolean;
  playlistTotal: number;
  playlistCurrent: number;
  errorMessage?: string;
  addedAt: number;
}

// Cleanup functions keyed by download ID
type Unlisten = () => void;
const unlisteners = new Map<string, Unlisten>();

function createDownloadStore() {
  let items = $state<DownloadItem[]>([]);
  let initialized = false;

  async function init() {
    if (initialized) return;
    initialized = true;
    // Nothing global to listen to on init — listeners are registered per-download
  }

  function addItem(item: DownloadItem) {
    items = [...items, item];
    // Start listening for progress events for this download
    _listenForItem(item.id);
  }

  async function _listenForItem(id: string) {
    const unlisten = await listenProgress(id, (event: ProgressEvent) => {
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return;

      const wasComplete = items[idx].status === 'complete';

      // Parse percent as number (API sends "45.3%" string)
      const percentNum = parseFloat(String(event.percent ?? '0').replace('%', '')) || 0;

      items[idx] = {
        ...items[idx],
        percent: percentNum,
        speed: event.speed ?? items[idx].speed,
        eta: event.eta ?? items[idx].eta,
        downloadedBytes: event.downloaded ?? items[idx].downloadedBytes,
        totalBytes: event.total ?? items[idx].totalBytes,
        currentTitle: event.filename
          ? _basename(event.filename)
          : items[idx].currentTitle,
        status: event.status as DownloadItem['status'],
        errorMessage: event.status === 'error' ? event.error : undefined,
      };

      // Save to history when newly completed
      if (event.status === 'complete' && !wasComplete) {
        const item = items[idx];
        historyStore.addItem({
          id: item.id,
          url: item.url,
          title: item.currentTitle || item.title,
          thumbnail: item.thumbnail,
          platform: item.platform,
          format: item.format,
          quality: item.quality,
          outputPath: item.outputPath,
          filePath: event.filename ?? '',
          fileSize: item.totalBytes || item.downloadedBytes,
          downloadedAt: Date.now(),
          isPlaylist: item.isPlaylist,
          playlistTotal: item.playlistTotal,
        }).catch((e) => console.error('Failed to save history:', e));

        // Stop listening after completion
        unlisteners.get(id)?.();
        unlisteners.delete(id);
      }

      if (event.status === 'cancelled' || event.status === 'error') {
        unlisteners.get(id)?.();
        unlisteners.delete(id);
      }
    });

    unlisteners.set(id, unlisten);
  }

  function removeItem(id: string) {
    unlisteners.get(id)?.();
    unlisteners.delete(id);
    items = items.filter(i => i.id !== id);
  }

  async function cancelDownload(id: string) {
    try {
      await apiCancelDownload(id);
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], status: 'cancelled' };
      }
    } catch (e) {
      console.error('Cancel failed:', e);
    }
  }

  function cleanup() {
    unlisteners.forEach((unlisten) => unlisten());
    unlisteners.clear();
  }

  return {
    get items() { return items; },
    get activeCount() {
      return items.filter(i => i.status === 'downloading' || i.status === 'processing').length;
    },
    get queuedCount() { return items.filter(i => i.status === 'queued').length; },
    init,
    addItem,
    removeItem,
    cancelDownload,
    cleanup,
  };
}

function _basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export const downloadStore = createDownloadStore();
