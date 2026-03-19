<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-dialog';
  import { goto } from '$app/navigation';
  import { v4 as uuidv4 } from 'uuid';
  
  import { settingsStore } from '$lib/stores/settings.svelte.js';
  import { downloadStore } from '$lib/stores/downloads.svelte.js';
  
  import UrlInput from '$lib/components/UrlInput.svelte';
  import VideoPreview from '$lib/components/VideoPreview.svelte';
  import PlaylistPreview from '$lib/components/PlaylistPreview.svelte';
  import SiteLogos from '$lib/components/SiteLogos.svelte';
  
  import type { VideoInfo, PlaylistInfo } from '$lib/types.js';

  let url = $state('');
  let loading = $state(false);
  let error = $state('');
  
  let videoInfo = $state<VideoInfo | null>(null);
  let playlistInfo = $state<PlaylistInfo | null>(null);
  
  // Local active settings for the current download
  let quality = $state(settingsStore.settings.defaultQuality);
  let format = $state(settingsStore.settings.defaultFormat);
  let outputPath = $state(settingsStore.settings.defaultDownloadPath);
  let embedThumbnail = $state(settingsStore.settings.embedThumbnail);
  let embedMetadata = $state(settingsStore.settings.embedMetadata);
  let downloadSubtitles = $state(settingsStore.settings.downloadSubtitles);
  let subtitleLang = $state(settingsStore.settings.subtitleLang);
  
  // Playlist selection
  let selectedItems = $state<Set<number>>(new Set());

  // Keep path synced with settings if it changes externally
  $effect(() => {
    if (!outputPath && settingsStore.settings.defaultDownloadPath) {
      outputPath = settingsStore.settings.defaultDownloadPath;
    }
  });

  async function handleFetch(urlVal: string, isPlaylist: boolean) {
    loading = true;
    error = '';
    videoInfo = null;
    playlistInfo = null;
    selectedItems = new Set();
    
    try {
      if (isPlaylist) {
        playlistInfo = await invoke<PlaylistInfo>('get_playlist_info', { url: urlVal });
        // Auto-select all by default
        selectedItems = new Set(playlistInfo.entries.map((_, i) => i));
      } else {
        videoInfo = await invoke<VideoInfo>('get_video_info', { url: urlVal });
      }
    } catch (err: any) {
      error = err.toString();
    } finally {
      loading = false;
    }
  }

  async function handleBrowse() {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: outputPath || await invoke('get_default_download_path'),
      title: 'Select Download Folder'
    });
    if (selected && typeof selected === 'string') {
      outputPath = selected;
      // Also update global default if changed from home page
      settingsStore.update({ defaultDownloadPath: selected });
    }
  }

  function handleOptionChange(key: string, val: boolean | string) {
    if (key === 'embedThumbnail') embedThumbnail = val as boolean;
    if (key === 'embedMetadata') embedMetadata = val as boolean;
    if (key === 'downloadSubtitles') downloadSubtitles = val as boolean;
  }

  async function startSingleDownload() {
    if (!videoInfo || !outputPath) return;

    const id = uuidv4();
    const payload = {
      id,
      url: videoInfo.webpage_url,
      format,
      quality,
      output_path: outputPath,
      embed_thumbnail: embedThumbnail,
      embed_metadata: embedMetadata,
      download_subtitles: downloadSubtitles,
      subtitle_lang: subtitleLang,
      is_playlist: false,
      playlist_items: null,
      rate_limit: settingsStore.settings.speedLimit,
      use_cookies: settingsStore.settings.useCookies,
      cookies_path: settingsStore.settings.useCookies ? settingsStore.settings.cookiesPath : null,
    };

    downloadStore.addItem({
      id,
      url: videoInfo.webpage_url,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      platform: videoInfo.platform,
      format,
      quality,
      outputPath,
      status: 'queued',
      percent: 0,
      speed: '0 B/s',
      eta: '--',
      downloadedBytes: 0,
      totalBytes: 0,
      currentTitle: videoInfo.title,
      isPlaylist: false,
      playlistTotal: 0,
      playlistCurrent: 0,
      addedAt: Date.now(),
    });

    try {
      await invoke('start_download', { payload });
      goto('/queue');
    } catch (err: any) {
      error = `Failed to start: ${err}`;
      downloadStore.removeItem(id);
    }
  }

  async function startPlaylistDownload(selectedIndices: number[]) {
    if (!playlistInfo || !outputPath || selectedIndices.length === 0) return;

    // Convert 0-based indices to 1-based yt-dlp item selection
    // e.g. "1,3,4"
    const itemsStr = selectedIndices.map(i => i + 1).sort((a,b)=>a-b).join(',');
    
    const id = uuidv4();
    const payload = {
      id,
      url: url, // original playlist URL
      format,
      quality,
      output_path: outputPath,
      embed_thumbnail: embedThumbnail,
      embed_metadata: embedMetadata,
      download_subtitles: downloadSubtitles,
      subtitle_lang: subtitleLang,
      is_playlist: true,
      playlist_items: itemsStr,
      rate_limit: settingsStore.settings.speedLimit,
      use_cookies: settingsStore.settings.useCookies,
      cookies_path: settingsStore.settings.useCookies ? settingsStore.settings.cookiesPath : null,
    };

    downloadStore.addItem({
      id,
      url: url,
      title: playlistInfo.playlist_title,
      thumbnail: playlistInfo.playlist_thumbnail,
      platform: videoInfo?.platform || 'Unknown',
      format,
      quality,
      outputPath,
      status: 'queued',
      percent: 0,
      speed: '0 B/s',
      eta: '--',
      downloadedBytes: 0,
      totalBytes: 0,
      currentTitle: 'Starting playlist extraction...',
      isPlaylist: true,
      playlistTotal: selectedIndices.length,
      playlistCurrent: 0,
      addedAt: Date.now(),
    });

    try {
      await invoke('start_download', { payload });
      goto('/queue');
    } catch (err: any) {
      error = `Failed to start: ${err}`;
      downloadStore.removeItem(id);
    }
  }

  function togglePlaylistItem(index: number) {
    if (selectedItems.has(index)) {
      selectedItems.delete(index);
    } else {
      selectedItems.add(index);
    }
    selectedItems = selectedItems; // trigger reactivity
  }

  function selectAll() {
    if (playlistInfo) {
      selectedItems = new Set(playlistInfo.entries.map((_, i) => i));
    }
  }
  
  function deselectAll() {
    selectedItems = new Set();
  }
</script>

<div class="page-container p-6">
  <div class="hero max-w-[800px] mx-auto mt-8 mb-12 text-center">
    <!-- Header visual -->
    <div class="hero-icon mb-6">
      <div class="glow"></div>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" stroke-width="2">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--accent)" />
            <stop offset="100%" stop-color="#818cf8" />
          </linearGradient>
        </defs>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </div>
    
    <h1 class="text-3xl font-bold mb-4">Download any video, anywhere.</h1>
    <p class="text-secondary mb-8 text-lg">
      Paste a URL from YouTube, TikTok, Instagram, Twitter, and over 1,800 other sites.
    </p>

    <UrlInput 
      bind:value={url} 
      {loading} 
      onsubmit={handleFetch} 
    />

    {#if error}
      <div class="error-toast animate-fade-in mt-6">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div class="error-msg">{error}</div>
        <button class="btn btn-ghost btn-sm btn-icon" aria-label="Dismiss error" onclick={() => error = ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    {/if}
  </div>

  <div class="content-area max-w-[1000px] mx-auto">
    {#if videoInfo}
      <div class="mb-12">
        <VideoPreview
          info={videoInfo}
          bind:quality
          bind:format
          bind:outputPath
          bind:embedThumbnail
          bind:embedMetadata
          bind:downloadSubtitles
          bind:subtitleLang
          onQualityChange={(q) => quality = q}
          onFormatChange={(f) => format = f}
          onOutputChange={(p) => outputPath = p}
          onOptionChange={handleOptionChange}
          onDownload={startSingleDownload}
          onBrowse={handleBrowse}
        />
      </div>
    {:else if playlistInfo}
      <div class="mb-12">
        <PlaylistPreview
          info={playlistInfo}
          bind:quality
          bind:format
          bind:outputPath
          bind:selectedItems
          onToggleItem={togglePlaylistItem}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onDownload={startPlaylistDownload}
          onBrowse={handleBrowse}
        />
      </div>
    {:else if !loading && !error}
      <!-- Empty state logos -->
      <div class="animate-fade-in text-center mt-12 mb-8">
        <h3 class="text-sm font-semibold text-secondary uppercase tracking-widest mb-6">Supported Platforms</h3>
        <SiteLogos />
      </div>
    {/if}
  </div>
</div>

<style>
  .hero-icon {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border-radius: 24px;
    background: var(--surface-raised);
    border: 1px solid var(--border);
  }

  .glow {
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle at center, var(--accent-glow) 0%, transparent 70%);
    z-index: -1;
    border-radius: 50%;
  }

  .error-toast {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: var(--error-bg);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--error);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    text-align: left;
    max-width: 100%;
  }

  .error-msg {
    font-size: 14px;
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
  }
</style>
