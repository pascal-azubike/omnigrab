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
  playlistTotal: number;
}

function createHistoryStore() {
  let items = $state<HistoryItem[]>([]);

  // Load from persistent storage on init
  async function init() {
    // Implement persistence logic here (Tauri Store or Android JSON)
  }

  function addItem(item: HistoryItem) {
    items = [item, ...items].slice(0, 100);
    save();
  }

  function removeItem(id: string) {
    items = items.filter(i => i.id !== id);
    save();
  }

  function clearHistory() {
    items = [];
    save();
  }

  async function save() {
    // Implement persistence logic here
  }

  return {
    get items() { return items; },
    init,
    addItem,
    removeItem,
    clearHistory
  };
}

export const historyStore = createHistoryStore();
