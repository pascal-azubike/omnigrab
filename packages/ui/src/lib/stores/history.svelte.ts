import { Store } from '@tauri-apps/plugin-store';
import { getPlatform } from '$lib/utils/platform';

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: string;
  format: string;
  quality: string;
  outputPath: string;
  filePath: string;
  fileSize: number;
  downloadedAt: number;
  isPlaylist: boolean;
  playlistTotal?: number;
}

const STORE_KEY = 'download_history';
// Named constant — max history items before oldest are trimmed
const MAX_HISTORY = 500;

// Debounce timer to batch disk writes (avoids writing on every addItem/removeItem)
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function createHistoryStore() {
  let items = $state<HistoryItem[]>([]);
  let tauriStore: Store | null = null;
  let isDesktop = false;

  async function init() {
    isDesktop = (await getPlatform()) === 'desktop';
    
    try {
      if (isDesktop) {
        tauriStore = await Store.load('omnigrab_history.json');
        const saved = await tauriStore.get<HistoryItem[]>(STORE_KEY);
        if (saved && Array.isArray(saved)) {
          items = saved;
        }
      } else {
        // Fallback for Android WebView / Web Environment
        const saved = localStorage.getItem(STORE_KEY);
        if (saved) {
          items = JSON.parse(saved);
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  async function addItem(item: HistoryItem) {
    // Avoid duplicates by ID
    items = [item, ...items.filter(i => i.id !== item.id)].slice(0, MAX_HISTORY);
    debouncedPersist();
  }

  async function removeItem(id: string) {
    items = items.filter(i => i.id !== id);
    debouncedPersist();
  }

  async function clearAll() {
    items = [];
    await persist(); // immediate flush on clear
  }

  function search(query: string): HistoryItem[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      i => i.title.toLowerCase().includes(q) || i.platform.toLowerCase().includes(q)
    );
  }

  // Debounce: batch multiple rapid writes into one disk write after 300ms
  function debouncedPersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persist(), 300);
  }

  async function persist() {
    try {
      if (isDesktop && tauriStore) {
        await tauriStore.set(STORE_KEY, items);
        await tauriStore.save();
      } else {
        localStorage.setItem(STORE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  return {
    get items() { return items; },
    init,
    addItem,
    removeItem,
    clearAll,
    search,
  };
}

export const historyStore = createHistoryStore();
