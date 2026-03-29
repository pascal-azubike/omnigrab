import { getDefaultDownloadPath, saveSettings as serverSaveSettings } from '$lib/utils/api';
import { getPlatform } from '$lib/utils/platform';

export interface Settings {
  downloadPath: string;
  theme: 'dark' | 'light' | 'system';
  maxConcurrentDownloads: number;
  preferMp4: boolean;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  downloadSubtitles: boolean;
  subtitleLang: string;
  useCookies: boolean;
  cookiesPath: string;
  ytDlpVersion: string;
}

const STORAGE_KEY = 'omnigrab-settings';

function getInitialTheme(): 'dark' | 'light' | 'system' {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.theme || 'system';
    }
  } catch (e) {
    console.error('Failed to load theme from storage:', e);
  }
  return 'system';
}

function createSettingsStore() {
  let settings = $state<Settings>({
    downloadPath: '',
    theme: getInitialTheme(),
    maxConcurrentDownloads: 3,
    preferMp4: true,
    embedThumbnail: true,
    embedMetadata: true,
    downloadSubtitles: false,
    subtitleLang: 'en',
    useCookies: false,
    cookiesPath: '',
    ytDlpVersion: 'unknown'
  });

  let initialized = $state(false);

  async function initDefaultPath() {
    if (initialized) return;
    try {
      const platform = await getPlatform();
      if (platform !== 'desktop') {
        // On Android: load all settings from the server's settings.json
        const res = await fetch('http://127.0.0.1:8765/settings');
        if (res.ok) {
          const serverSettings = await res.json();
          if (serverSettings.download_path) {
            settings.downloadPath = serverSettings.download_path;
          }
        }
      } else {
        // Desktop: load from localStorage then get default if empty
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            Object.assign(settings, parsed);
          } catch (e) {
            console.error('Failed to parse stored settings:', e);
          }
        }
        if (!settings.downloadPath) {
          const defaultPath = await getDefaultDownloadPath();
          settings.downloadPath = defaultPath;
        }
      }
    } catch (e) {
      console.error('Failed to initialize settings:', e);
    } finally {
      initialized = true;
    }
  }

  function applyTheme(theme: 'dark' | 'light' | 'system') {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }

  async function updateSettings(newSettings: Partial<Settings>) {
    Object.assign(settings, newSettings);
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
    await save();
    // Also sync to Android server so the Python backend knows the new path
    try {
      await serverSaveSettings({
        download_path: settings.downloadPath,
        max_concurrent_downloads: settings.maxConcurrentDownloads,
        embed_thumbnail: settings.embedThumbnail,
        embed_metadata: settings.embedMetadata,
        download_subtitles: settings.downloadSubtitles,
        subtitle_lang: settings.subtitleLang,
        use_cookies: settings.useCookies,
        cookies_path: settings.cookiesPath,
      });
    } catch (e) {
      console.error('Failed to sync settings to server:', e);
    }
  }

  async function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // Apply theme on initialization
  if (typeof window !== 'undefined') {
    applyTheme(settings.theme);
    // Initialize default download path
    initDefaultPath();
  }

  return {
    get current() { return settings; },
    updateSettings,
    initDefaultPath
  };
}

export const settingsStore = createSettingsStore();