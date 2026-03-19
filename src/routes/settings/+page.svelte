<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte.js';
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';

  const QUALITY_OPTIONS = [
    { value: 'best', label: 'Best Quality' },
    { value: '2160', label: '4K (2160p)' },
    { value: '1080', label: '1080p HD' },
    { value: '720', label: '720p HD' },
    { value: '480', label: '480p' },
    { value: '360', label: '360p' },
    { value: 'audio', label: 'Audio Only' },
  ];

  const FORMAT_OPTIONS = [
    { value: 'mp4', label: 'MP4' },
    { value: 'mkv', label: 'MKV' },
    { value: 'webm', label: 'WebM' },
    { value: 'mp3', label: 'MP3' },
    { value: 'm4a', label: 'M4A' },
  ];

  let settings = $derived(settingsStore.settings);

  async function handleBrowseFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: settings.defaultDownloadPath,
      title: 'Select Default Download Folder'
    });
    if (selected && typeof selected === 'string') {
      settingsStore.update({ defaultDownloadPath: selected });
    }
  }

  async function handleImportCookies() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
      title: 'Select cookies.txt file'
    });
    if (selected && typeof selected === 'string') {
      settingsStore.update({ useCookies: true, cookiesPath: selected });
    }
  }

  function updateFieldList(key: string, e: Event) {
    const target = e.target as HTMLInputElement;
    settingsStore.update({ [key]: target.value });
  }

  function updateFieldCheck(key: string, e: Event) {
    const target = e.target as HTMLInputElement;
    settingsStore.update({ [key]: target.checked });
  }
</script>

<div class="page-container p-6 max-w-[800px] mx-auto">
  <div class="header-section mb-8">
    <h1 class="text-2xl font-bold">Settings</h1>
    <p class="text-secondary">Configure defaults and app preferences</p>
  </div>

  <div class="settings-grid flex-col gap-8">
    <!-- General -->
    <section class="settings-section">
      <h2 class="section-title">General</h2>
      <div class="card p-0 overflow-hidden">
        <div class="setting-row">
          <div class="setting-info">
            <h3 class="font-medium">Default Download Folder</h3>
            <p class="text-xs text-secondary mt-1">Where files are saved by default</p>
          </div>
          <div class="setting-action flex gap-2 w-[350px]">
            <input type="text" class="input flex-1" readonly value={settings.defaultDownloadPath} />
            <button class="btn btn-secondary" onclick={handleBrowseFolder}>Browse</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <h3 class="font-medium">Default Quality</h3>
          </div>
          <div class="setting-action">
            <select class="input w-[200px]" value={settings.defaultQuality} onchange={(e) => updateFieldList('defaultQuality', e)}>
              {#each QUALITY_OPTIONS as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <h3 class="font-medium">Default Format</h3>
          </div>
          <div class="setting-action">
            <select class="input w-[200px]" value={settings.defaultFormat} onchange={(e) => updateFieldList('defaultFormat', e)}>
              {#each FORMAT_OPTIONS as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Downloads Defaults -->
    <section class="settings-section">
      <h2 class="section-title">Downloads</h2>
      <div class="card p-0 overflow-hidden">
        <label class="setting-row cursor-pointer">
          <div class="setting-info">
            <h3 class="font-medium">Embed Thumbnail</h3>
            <p class="text-xs text-secondary mt-1">Write artwork to audio/video file</p>
          </div>
          <div class="setting-action">
            <label class="toggle">
              <input type="checkbox" checked={settings.embedThumbnail} onchange={(e) => updateFieldCheck('embedThumbnail', e)} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </label>

        <label class="setting-row cursor-pointer">
          <div class="setting-info">
            <h3 class="font-medium">Embed Metadata</h3>
            <p class="text-xs text-secondary mt-1">Write title, artist, and URL to file tags</p>
          </div>
          <div class="setting-action">
            <label class="toggle">
              <input type="checkbox" checked={settings.embedMetadata} onchange={(e) => updateFieldCheck('embedMetadata', e)} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </label>

        <div class="setting-row">
          <div class="setting-info">
            <h3 class="font-medium">Speed Limit</h3>
            <p class="text-xs text-secondary mt-1">e.g. "2M" for 2MB/s, "500K" for 500KB/s</p>
          </div>
          <div class="setting-action">
            <input 
              type="text" 
              class="input w-[120px]" 
              placeholder="Unlimited" 
              value={settings.speedLimit} 
              onchange={(e) => updateFieldList('speedLimit', e)} 
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Authentication -->
    <section class="settings-section">
      <h2 class="section-title">Authentication</h2>
      <p class="text-xs text-secondary mb-4">
        Required to download private or age-restricted videos. 
        Export cookies from your browser using the "Get cookies.txt LOCALLY" extension.
      </p>
      
      <div class="card p-0 overflow-hidden">
        <div class="setting-row flex-col items-start gap-4">
          <label class="flex items-center gap-3 w-full cursor-pointer">
            <label class="toggle">
              <input type="checkbox" checked={settings.useCookies} onchange={(e) => updateFieldCheck('useCookies', e)} />
              <span class="toggle-slider"></span>
            </label>
            <span class="font-medium">Use cookies.txt file</span>
          </label>
          
          {#if settings.useCookies}
            <div class="w-full flex gap-2 pl-12 animate-fade-in">
              <input 
                type="text" 
                class="input flex-1 font-mono text-xs" 
                readonly 
                placeholder="No cookies file selected..." 
                value={settings.cookiesPath} 
              />
              <button class="btn btn-secondary" onclick={handleImportCookies}>Import File</button>
            </div>
          {/if}
        </div>
      </div>
    </section>

    <!-- Appearance -->
    <section class="settings-section mb-12">
      <h2 class="section-title">Appearance</h2>
      <div class="card p-0 overflow-hidden">
        <div class="setting-row">
          <div class="setting-info">
            <h3 class="font-medium">Theme</h3>
            <p class="text-xs text-secondary mt-1">Select app theme</p>
          </div>
          <div class="setting-action">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .header-section {
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .setting-row:last-child {
    border-bottom: none;
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }
</style>
