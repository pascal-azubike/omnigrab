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

function createSettingsStore() {
  let settings = $state<Settings>({
    downloadPath: '',
    theme: 'system',
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

  async function updateSettings(newSettings: Partial<Settings>) {
    Object.assign(settings, newSettings);
    await save();
  }

  async function save() {
    // Implement persistence logic here
  }

  return {
    get current() { return settings; },
    updateSettings
  };
}

export const settingsStore = createSettingsStore();
