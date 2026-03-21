import { listenProgress, cancelDownload as apiCancelDownload } from '$lib/utils/api';
import type { ProgressEvent, DownloadPayload } from '$lib/types';

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
      current_title: 'Initializing...',
      added_at: Date.now()
    };
    
    items.push(newItem);
    
    const unlisten = await listenProgress(payload.id, (event) => {
      const index = items.findIndex(i => i.id === event.id);
      if (index === -1) return;
      
      items[index] = {
        ...items[index],
        ...event,
        // Ensure percent is a number if it comes as a string from backend
        percent: typeof event.percent === 'string' 
          ? parseFloat(event.percent.replace('%', '')) 
          : event.percent
      };
      
      if (event.status === 'complete' || event.status === 'error' || event.status === 'cancelled') {
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
    addDownload,
    cancelDownload,
    removeDownload
  };
}

export const downloadStore = createDownloadStore();
