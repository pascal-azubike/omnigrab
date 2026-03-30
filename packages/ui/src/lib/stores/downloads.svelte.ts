import { listenProgress, cancelDownload as apiCancelDownload } from '$lib/utils/api';
import type { ProgressEvent, DownloadPayload } from '$lib/types';
import { historyStore } from './history.svelte';

export interface DownloadItem extends DownloadPayload {
  status: 'queued' | 'downloading' | 'processing' | 'complete' | 'error' | 'cancelled';
  percent: number;
  speed: string;
  eta: string;
  downloaded_bytes: number;
  total_bytes: number;
  current_title: string;
  error?: string;
  added_at: number;
}

function createDownloadStore() {
  let items = $state<DownloadItem[]>([]);
  const unlisteners = new Map<string, () => void>();

  async function addDownload(payload: DownloadPayload) {
    const newItem: DownloadItem = {
      ...payload,
      status: 'queued',
      percent: 0,
      speed: '0 B/s',
      eta: '--:--',
      downloaded_bytes: 0,
      total_bytes: 0,
      current_title: payload.title || 'Initializing...',
      added_at: Date.now()
    };
    
    items.push(newItem);
    
    // Add to history eagerly so it appears in the list immediately (as 'queued')
    historyStore.addItem({
      id: newItem.id,
      url: newItem.url,
      title: newItem.title || newItem.current_title || 'Media Download',
      thumbnail: newItem.thumbnail || '',
      platform: 'Media Video',
      format: newItem.format,
      quality: newItem.quality,
      outputPath: newItem.output_path || '',
      filePath: '',
      fileSize: 0,
      downloadedAt: Date.now(),
      isPlaylist: newItem.is_playlist,
      playlistTotal: newItem.playlist_total || 0,
      status: 'queued'
    });
    
    const unlisten = await listenProgress(payload.id, (event) => {
      if (event.status === 'heartbeat' as any) return;
      
      const index = items.findIndex(i => i.id === event.id);
      if (index === -1) return;
      
      const previousStatus = items[index].status;
      
      items[index] = {
        ...items[index],
        ...event,
        percent: typeof event.percent === 'string' 
          ? parseFloat(String(event.percent).replace('%', '')) 
          : Number(event.percent) || 0
      };
      
      // Only sync to history if the status transitioned or finalized
      if (previousStatus !== event.status || event.status === 'complete' || event.status === 'error') {
        historyStore.updateItem(event.id, {
          status: event.status,
          fileSize: items[index].total_bytes || items[index].downloaded_bytes || 0,
          title: items[index].current_title || items[index].title,
          error: event.error
        });
      }
      
      if (['complete', 'error', 'cancelled'].includes(event.status)) {
        const cleanup = unlisteners.get(event.id);
        if (cleanup) cleanup();
        unlisteners.delete(event.id);
      }
    });
    
    unlisteners.set(payload.id, unlisten);
  }

  async function cancelDownload(id: string) {
    await apiCancelDownload(id);
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index].status = 'cancelled';
    }
  }

  function removeDownload(id: string) {
    const cleanup = unlisteners.get(id);
    if (cleanup) cleanup();
    unlisteners.delete(id);
    items = items.filter(i => i.id !== id);
  }

  return {
    get items() { return items; },
    get activeCount() { return items.filter(i => ['downloading', 'processing'].includes(i.status)).length; },
    get queuedCount() { return items.filter(i => i.status === 'queued').length; },
    addDownload,
    cancelDownload,
    removeDownload
  };
}

export const downloadStore = createDownloadStore();
