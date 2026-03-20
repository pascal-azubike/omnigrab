<script lang="ts">
  import type { DownloadItem as IDownloadItem } from '$lib/stores/downloads.svelte.js';
  import { detectPlatform } from '$lib/utils/platform.js';

  interface Props {
    item: IDownloadItem;
    position: number;
    onCancel: (id: string) => void;
  }

  let { item, position, onCancel }: Props = $props();
  let platform = $derived(detectPlatform(item.url));
</script>

<div class="queue-item card-raised">
  <div class="position badge badge-accent">#{position}</div>
  
  <div class="thumb-container">
    {#if item.thumbnail}
      <img src={item.thumbnail} alt="" class="thumb" />
    {:else}
      <div class="thumb-fallback"></div>
    {/if}
  </div>

  <div class="info">
    <div class="title" title={item.title}>{item.title}</div>
    <div class="meta text-secondary text-xs">
      {item.quality} • {item.format} • {platform?.name || 'Unknown'} 
      {#if item.isPlaylist}
        • Playlist ({item.playlistTotal || '?'})
      {/if}
    </div>
    <div class="status text-xs mt-1 text-accent font-medium">Waiting to start...</div>
  </div>

  <button class="btn btn-ghost btn-icon" onclick={() => onCancel(item.id)} title="Remove from queue">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>

<style>
  .queue-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    opacity: 0.8;
  }

  .position {
    flex-shrink: 0;
  }

  .thumb-container {
    width: 64px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-fallback {
    width: 100%;
    height: 100%;
    background: var(--surface);
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
