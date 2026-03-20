<script lang="ts">
  import { formatDuration } from '$lib/utils/formatBytes.js';
  import type { PlaylistInfo, PlaylistEntry } from '$lib/types.js';

  interface Props {
    info: PlaylistInfo;
    quality: string;
    format: string;
    outputPath: string;
    selectedItems: Set<number>;
    onToggleItem: (index: number) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDownload: (selected: number[]) => void;
    onBrowse?: () => void;
  }

  let {
    info,
    quality = $bindable(),
    format = $bindable(),
    outputPath = $bindable(),
    selectedItems = $bindable(new Set()),
    onToggleItem,
    onSelectAll,
    onDeselectAll,
    onDownload,
    onBrowse,
  }: Props = $props();

  let allSelected = $derived(selectedItems.size === info.entries.length);
  let selectedCount = $derived(selectedItems.size);

  const QUALITY_OPTIONS = [
    { value: 'best', label: 'Best' },
    { value: '1080', label: '1080p' },
    { value: '720', label: '720p' },
    { value: '480', label: '480p' },
    { value: '360', label: '360p' },
    { value: 'audio', label: 'Audio Only' },
  ];

  const FORMAT_OPTIONS = [
    { value: 'mp4', label: 'MP4' },
    { value: 'mkv', label: 'MKV' },
    { value: 'mp3', label: 'MP3' },
    { value: 'm4a', label: 'M4A' },
  ];

  function handleDownload() {
    onDownload([...selectedItems]);
  }
</script>

<div class="playlist-preview animate-fade-in">
  <!-- Header -->
  <div class="playlist-header">
    <div class="playlist-meta">
      {#if info.playlist_thumbnail}
        <img src={info.playlist_thumbnail} alt="" class="playlist-thumb" />
      {/if}
      <div class="playlist-info">
        <h2 class="playlist-title">{info.playlist_title}</h2>
        <p class="playlist-uploader">{info.playlist_uploader}</p>
        <span class="badge badge-accent">{info.total_count} videos</span>
      </div>
    </div>

    <!-- Options row -->
    <div class="options-row">
      <div class="selects">
        <select bind:value={quality} class="input">
          {#each QUALITY_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
        <select bind:value={format} class="input">
          {#each FORMAT_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <div class="path-input">
        <input bind:value={outputPath} type="text" class="input" readonly={!onBrowse} placeholder="Output folder..." />
          {#if onBrowse}
            <button class="btn btn-secondary btn-sm" onclick={onBrowse}>Browse</button>
          {/if}
        </div>
    </div>

    <!-- Selection controls -->
    <div class="selection-bar">
      <div class="selection-actions">
        <button class="btn btn-ghost btn-sm" onclick={onSelectAll} disabled={allSelected}>
          Select all
        </button>
        <button class="btn btn-ghost btn-sm" onclick={onDeselectAll} disabled={selectedCount === 0}>
          Deselect all
        </button>
        <span class="selection-count text-secondary text-sm">{selectedCount} selected</span>
      </div>

      <button
        class="btn btn-primary"
        onclick={handleDownload}
        disabled={selectedCount === 0}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Selected ({selectedCount})
      </button>
    </div>
  </div>

  <!-- Entry list -->
  <div class="entry-list">
    {#each info.entries as entry, i}
      {@const isSelected = selectedItems.has(i)}
      <div
        class="entry-row"
        class:selected={isSelected}
        onclick={() => onToggleItem(i)}
        role="checkbox"
        aria-checked={isSelected}
        tabindex="0"
        onkeydown={(e) => e.key === ' ' && onToggleItem(i)}
      >
        <div class="entry-check">
          <div class="checkbox" class:checked={isSelected}>
            {#if isSelected}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            {/if}
          </div>
        </div>

        <div class="entry-thumb-container">
          {#if entry.thumbnail}
            <img src={entry.thumbnail} alt={entry.title} class="entry-thumb" loading="lazy" />
          {:else}
            <div class="entry-thumb-fallback">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
          {/if}
        </div>

        <div class="entry-info">
          <span class="entry-index">#{entry.index}</span>
          <span class="entry-title">{entry.title}</span>
        </div>

        {#if entry.duration}
          <span class="entry-duration font-mono">{formatDuration(entry.duration)}</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .playlist-preview {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: var(--shadow-md);
  }

  .playlist-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .playlist-meta {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .playlist-thumb {
    width: 80px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .playlist-info { display: flex; flex-direction: column; gap: 6px; }

  .playlist-title {
    font-size: 18px;
    font-weight: 600;
  }

  .playlist-uploader {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .options-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .selects {
    display: flex;
    gap: 8px;
  }

  .selects .input { width: 130px; }

  .path-input {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .path-input .input { flex: 1; min-width: 0; cursor: default; }

  .selection-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .selection-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entry-list {
    max-height: 420px;
    overflow-y: auto;
  }

  .entry-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 24px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background 150ms;
  }

  .entry-row:last-child { border-bottom: none; }
  .entry-row:hover { background: var(--surface-raised); }
  .entry-row.selected { background: color-mix(in srgb, var(--accent) 8%, transparent); }

  .entry-check { flex-shrink: 0; }

  .checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid var(--border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms;
  }

  .checkbox.checked {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .entry-thumb-container {
    width: 56px;
    height: 40px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--surface-raised);
  }

  .entry-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .entry-thumb-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .entry-info {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .entry-index {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
    flex-shrink: 0;
  }

  .entry-title {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-duration {
    font-size: 11px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
</style>
