import { isDesktop, getDefaultDownloadPath, getSettings, saveSettings } from '$lib/utils/api';

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
  let tauriStore: any = null;

  async function init() {
    try {
      if (await isDesktop()) {
        const { Store } = await import('@tauri-apps/plugin-store');
        tauriStore = await Store.load('omnigrab_settings.json');
        const saved = (await tauriStore.get(STORE_KEY)) as AppSettings | null;
        if (saved) settings = { ...DEFAULTS, ...saved };
      } else {
        // Android / Browser
        const saved = await getSettings<AppSettings>();
        if (saved) settings = { ...DEFAULTS, ...saved };
      }

      // Fetch default download path if not set
      if (!settings.defaultDownloadPath) {
        const path = await getDefaultDownloadPath();
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
    if (typeof document === 'undefined') return;
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
      if (await isDesktop()) {
        await tauriStore?.set(STORE_KEY, $state.snapshot(settings));
        await tauriStore?.save();
      } else {
        await saveSettings($state.snapshot(settings));
      }
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
