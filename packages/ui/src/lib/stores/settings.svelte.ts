import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

export interface AppSettings {
  // General
  defaultDownloadPath: string;
  defaultQuality: string;
  defaultFormat: string;
  maxConcurrentDownloads: number;
  showNotifications: boolean;
  // Downloads
  embedThumbnail: boolean;
  embedMetadata: boolean;
  downloadSubtitles: boolean;
  subtitleLang: string;
  speedLimit: string;
  downloadDelay: number;
  // Auth
  useCookies: boolean;
  cookiesPath: string;
  ytPoToken: string;
  // Appearance
  theme: 'dark' | 'light' | 'system';
}

const DEFAULTS: AppSettings = {
  defaultDownloadPath: '',
  defaultQuality: 'best',
  defaultFormat: 'mp4',
  maxConcurrentDownloads: 3,
  showNotifications: true,
  embedThumbnail: true,
  embedMetadata: true,
  downloadSubtitles: false,
  subtitleLang: 'en',
  speedLimit: '',
  downloadDelay: 3,
  useCookies: false,
  cookiesPath: '',
  ytPoToken: '',
  theme: 'dark',
};

const STORE_KEY = 'settings';

function createSettingsStore() {
  let settings = $state<AppSettings>({ ...DEFAULTS });
  let store: Store | null = null;

  async function init() {
    try {
      store = await Store.load('omnigrab_settings.json');
      const saved = await store.get<AppSettings>(STORE_KEY);
      if (saved) {
        settings = { ...DEFAULTS, ...saved };
      }
      // Fetch default download path from Rust if not set
      if (!settings.defaultDownloadPath) {
        const path = await invoke<string>('get_default_download_path');
        settings = { ...settings, defaultDownloadPath: path };
        await persist();
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    applyTheme(settings.theme);
  }

  async function update(partial: Partial<AppSettings>) {
    settings = { ...settings, ...partial };
    if (partial.theme) applyTheme(partial.theme);
    await persist();
  }

  function applyTheme(theme: AppSettings['theme']) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.removeAttribute('data-theme');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    }
  }

  async function persist() {
    try {
      await store?.set(STORE_KEY, settings);
      await store?.save();
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  return {
    get settings() { return settings; },
    init,
    update,
  };
}

export const settingsStore = createSettingsStore();
