import { getDefaultDownloadPath } from '$lib/utils/api';

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
      const defaultPath = await getDefaultDownloadPath();
      if (!settings.downloadPath) {
        settings.downloadPath = defaultPath;
      }
    } catch (e) {
      console.error('Failed to get default download path:', e);
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