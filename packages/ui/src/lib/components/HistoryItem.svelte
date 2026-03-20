<script lang="ts">
  import type { HistoryItem } from '$lib/stores/history.svelte.js';
  import { detectPlatform } from '$lib/utils/platform.js';
  import { formatBytes, formatRelativeTime } from '$lib/utils/formatBytes.js';

  interface Props {
    item: HistoryItem;
    onOpenFile: (path: string) => void;
    onOpenFolder: (path: string) => void;
    onRemove: (id: string) => void;
    onRedownload: (url: string) => void;
  }

  let { item, onOpenFile, onOpenFolder, onRemove, onRedownload }: Props = $props();
  let platform = $derived(detectPlatform(item.url));
</script>

<div class="history-item card animate-fade-in">
  <div class="thumb-wrapper">
    {#if item.thumbnail}
      <img src={item.thumbnail} alt="" class="thumb" loading="lazy" />
    {:else}
      <div class="thumb-fallback"></div>
    {/if}
    {#if platform}
      <div class="platform-icon" style="background-color: {platform.color}">
        <img src="/platform-icons/{platform.icon}.svg" alt="" width="14" height="14" />
      </div>
    {/if}
  </div>

  <div class="content">
    <div class="header">
      <h3 class="title" title={item.title}>{item.title}</h3>
      <div class="actions">
        <button class="btn btn-ghost btn-icon btn-sm" onclick={() => onRedownload(item.url)} title="Download again">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="btn btn-ghost btn-icon btn-sm text-error" onclick={() => onRemove(item.id)} title="Remove from history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="meta text-xs text-secondary">
      <span class="badge badge-success">Complete</span>
      <span class="divider"></span>
      <span>{item.quality}</span>
      <span class="divider"></span>
      <span>{item.format}</span>
      {#if item.fileSize}
        <span class="divider"></span>
        <span class="font-mono">{formatBytes(item.fileSize)}</span>
      {/if}
      <span class="divider"></span>
      <span>Downloaded {formatRelativeTime(item.downloadedAt)}</span>
      {#if item.isPlaylist}
        <span class="divider"></span>
        <span class="text-accent font-medium">Playlist ({item.playlistTotal || '?'})</span>
      {/if}
    </div>

    <div class="file-path truncate text-xs text-secondary mt-1 font-mono" title={item.filePath}>
      {item.filePath}
    </div>

    <div class="button-row mt-3">
      <button class="btn btn-primary btn-sm flex-1" onclick={() => onOpenFile(item.filePath)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Open File
      </button>
      <button class="btn btn-secondary btn-sm flex-1" onclick={() => onOpenFolder(item.outputPath)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        Open Folder
      </button>
    </div>
  </div>
</div>

<style>
  .history-item {
    display: flex;
    gap: 20px;
    padding: 20px;
  }

  @media (max-width: 600px) {
    .history-item { flex-direction: column; gap: 12px; }
  }

  .thumb-wrapper {
    position: relative;
    width: 200px;
    height: 112px;
    border-radius: 8px;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  @media (max-width: 600px) {
    .thumb-wrapper { width: 100%; height: auto; aspect-ratio: 16/9; }
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .thumb-fallback {
    width: 100%;
    height: 100%;
    background: var(--surface-raised);
    border-radius: 8px;
  }

  .platform-icon {
    position: absolute;
    bottom: -6px;
    right: -6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .title {
    font-size: 16px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .meta .divider {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--border);
  }

  .button-row {
    display: flex;
    gap: 12px;
    margin-top: auto;
  }
</style>
