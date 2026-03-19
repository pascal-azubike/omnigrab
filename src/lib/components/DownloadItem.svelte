<script lang="ts">
  import type { DownloadItem as IDownloadItem } from '$lib/stores/downloads.svelte.js';
  import { formatBytes, formatSpeed, formatEta } from '$lib/utils/formatBytes.js';
  import { detectPlatform } from '$lib/utils/platform.js';

  interface Props {
    item: IDownloadItem;
    onCancel: (id: string) => void;
  }

  let { item, onCancel }: Props = $props();

  let platform = $derived(detectPlatform(item.url));
  let isComplete = $derived(item.status === 'complete');
  let isError = $derived(item.status === 'error');
  let isProcessing = $derived(item.status === 'processing');

  function handleCancel() {
    onCancel(item.id);
  }
</script>

<div class="download-item card" class:complete={isComplete} class:error={isError}>
  <!-- Header -->
  <div class="header">
    <div class="item-info">
      <div class="thumb-container">
        {#if item.thumbnail}
          <img src={item.thumbnail} alt="" class="thumb" />
        {:else}
          <div class="thumb-fallback"></div>
        {/if}
        {#if platform}
          <div class="platform-icon" style="background-color: {platform.color}">
            <img src="/platform-icons/{platform.icon}.svg" alt="" width="12" height="12" />
          </div>
        {/if}
      </div>
      <div class="title-container">
        <div class="title" title={item.title}>{item.title}</div>
        <div class="meta text-secondary text-xs">
          {item.quality} • {item.format} • {platform?.name || 'Unknown'}
        </div>
      </div>
    </div>

    <div class="actions">
      {#if !isComplete && !isError}
        <button class="btn btn-ghost btn-icon" onclick={handleCancel} title="Cancel Download">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Progress area -->
  <div class="progress-area">
    <!-- Playlist sub-progress -->
    {#if item.isPlaylist && item.playlistTotal > 0}
      <div class="playlist-meta text-xs font-semibold mb-1 text-accent">
        Video {item.playlistCurrent} of {item.playlistTotal}
        {#if item.currentTitle && item.currentTitle !== item.title}
          <span class="text-secondary font-normal ml-2 truncate">
            Downloading: {item.currentTitle.length > 40 ? item.currentTitle.substring(0, 40) + '...' : item.currentTitle}
          </span>
        {/if}
      </div>
    {/if}

    <div class="status-row">
      <div class="status-badge" class:error={isError} class:success={isComplete} class:active={!isComplete && !isError}>
        {#if isError}
          Failed
        {:else if isComplete}
          Complete
        {:else if isProcessing}
          Processing (Merging)...
        {:else}
          Downloading
        {/if}
      </div>

      {#if !isComplete && !isError && !isProcessing}
        <div class="stats font-mono text-xs">
          <span class="percent text-lg font-bold">{item.percent.toFixed(1)}%</span>
          <span class="divider">|</span>
          <span class="speed" title="Speed">{formatSpeed(item.speed)}</span>
          <span class="divider">|</span>
          <span class="eta" title="ETA">{formatEta(item.eta)}</span>
          <span class="divider">|</span>
          <span class="sizes" title="Downloaded / Total">
            {formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}
          </span>
        </div>
      {/if}
    </div>

    <!-- Main Progress Bar -->
    <div class="progress-bar mt-2">
      <div
        class="progress-bar-fill"
        class:complete={isComplete}
        class:processing={isProcessing}
        class:error={isError}
        style="width: {isComplete || isProcessing ? 100 : item.percent}%"
      ></div>
    </div>

    {#if isError && item.errorMessage}
      <div class="error-msg mt-2 text-xs text-error bg-[var(--error-bg)] p-2 rounded">
        {item.errorMessage}
      </div>
    {/if}
  </div>
</div>

<style>
  .download-item {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    transition: all 0.3s ease;
  }

  .download-item.complete {
    border-color: var(--success);
    background: var(--success-bg);
  }

  .download-item.error {
    border-color: var(--error);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .item-info {
    display: flex;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .thumb-container {
    position: relative;
    width: 80px;
    height: 45px;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .thumb-fallback {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    background: var(--surface-raised);
  }

  .platform-icon {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--surface);
  }

  .title-container {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .status-badge {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .status-badge.active { color: var(--accent); }
  .status-badge.success { color: var(--success); }
  .status-badge.error { color: var(--error); }

  .stats {
    display: flex;
    align-items: baseline;
    gap: 8px;
    color: var(--text-secondary);
  }

  .stats .divider { color: var(--border); }
  .stats .percent { color: var(--text-primary); }

  .progress-bar-fill.error {
    background: var(--error);
  }

  .playlist-meta {
    display: flex;
    align-items: center;
  }
</style>
