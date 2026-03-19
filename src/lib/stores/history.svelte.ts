import { Store } from '@tauri-apps/plugin-store';

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
const MAX_HISTORY = 500;

function createHistoryStore() {
  let items = $state<HistoryItem[]>([]);
  let store: Store | null = null;

  async function init() {
    try {
      store = await Store.load('omnigrab_history.json');
      const saved = await store.get<HistoryItem[]>(STORE_KEY);
      if (saved && Array.isArray(saved)) {
        items = saved;
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  async function addItem(item: HistoryItem) {
    // Avoid duplicates by ID
    items = [item, ...items.filter(i => i.id !== item.id)].slice(0, MAX_HISTORY);
    await persist();
  }

  async function removeItem(id: string) {
    items = items.filter(i => i.id !== id);
    await persist();
  }

  async function clearAll() {
    items = [];
    await persist();
  }

  function search(query: string): HistoryItem[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      i => i.title.toLowerCase().includes(q) || i.platform.toLowerCase().includes(q)
    );
  }

  async function persist() {
    try {
      await store?.set(STORE_KEY, items);
      await store?.save();
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
