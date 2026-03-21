<script lang="ts">
  import { formatDuration } from '$lib/utils/formatBytes.js';
  import type { VideoInfo } from '$lib/types.js';

  interface Props {
    info: VideoInfo;
    quality: string;
    format: string;
    outputPath: string;
    embedThumbnail: boolean;
    embedMetadata: boolean;
    downloadSubtitles: boolean;
    subtitleLang: string;
    onQualityChange: (q: string) => void;
    onFormatChange: (f: string) => void;
    onOutputChange: (p: string) => void;
    onOptionChange: (key: string, val: boolean | string) => void;
    onDownload: () => void;
    onBrowse: () => void;
    isDesktop: boolean;
  }

  let {
    info,
    quality = $bindable(),
    format = $bindable(),
    outputPath = $bindable(),
    embedThumbnail = $bindable(),
    embedMetadata = $bindable(),
    downloadSubtitles = $bindable(),
    subtitleLang = $bindable(),
    onDownload,
    onBrowse,
    isDesktop,
  }: Props = $props();

  let imgLoaded = $state(false);
  let imgError = $state(false);

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
    { value: 'flac', label: 'FLAC' },
  ];

  let audioFormats = $derived(['audio'].includes(quality)
    ? FORMAT_OPTIONS.filter(f => ['mp3', 'm4a', 'flac'].includes(f.value))
    : FORMAT_OPTIONS.filter(f => ['mp4', 'mkv', 'webm'].includes(f.value))
  );
</script>

<div class="video-preview animate-fade-in">
  <!-- Thumbnail -->
  <div class="thumbnail-container">
    {#if !imgLoaded && !imgError}
      <div class="skeleton" style="width:100%;height:100%;position:absolute;inset:0;border-radius:12px"></div>
    {/if}
    {#if info.thumbnail && !imgError}
      <img
        src={info.thumbnail}
        alt={info.title}
        class="thumbnail"
        class:loaded={imgLoaded}
        onload={() => imgLoaded = true}
        onerror={() => imgError = true}
      />
    {:else}
      <div class="thumbnail-fallback">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
    {/if}
    {#if info.duration}
      <span class="duration font-mono">{formatDuration(info.duration)}</span>
    {/if}
  </div>

  <!-- Info -->
  <div class="info-section">
    <h2 class="video-title" title={info.title}>{info.title}</h2>
    <div class="meta">
      <span class="platform-tag">{info.platform}</span>
      {#if info.uploader}
        <span class="uploader">by {info.uploader}</span>
      {/if}
    </div>

    <!-- Options grid -->
    <div class="options-grid">
      <!-- Quality -->
      <div class="option-group">
        <div class="option-label">Quality</div>
        <select bind:value={quality} class="input">
          {#each QUALITY_OPTIONS as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <!-- Format -->
      <div class="option-group">
        <div class="option-label">Format</div>
        <select bind:value={format} class="input">
          {#each audioFormats as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <!-- Output folder -->
      <div class="option-group full-width">
        <div class="option-label">Save to</div>
        <div class="path-input">
          <input
            bind:value={outputPath}
            type="text"
            class="input"
            placeholder="Select output folder..."
            readonly
          />
          {#if isDesktop}
            <button class="btn btn-secondary btn-sm" onclick={onBrowse}>Browse</button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Toggles -->
    <div class="toggles">
      <label class="toggle-row">
        <span>Embed thumbnail</span>
        <label class="toggle">
          <input type="checkbox" bind:checked={embedThumbnail} />
          <span class="toggle-slider"></span>
        </label>
      </label>
      <label class="toggle-row">
        <span>Embed metadata</span>
        <label class="toggle">
          <input type="checkbox" bind:checked={embedMetadata} />
          <span class="toggle-slider"></span>
        </label>
      </label>
      <label class="toggle-row">
        <span>Download subtitles</span>
        <label class="toggle">
          <input type="checkbox" bind:checked={downloadSubtitles} />
          <span class="toggle-slider"></span>
        </label>
      </label>
      {#if downloadSubtitles}
        <div class="toggle-row">
          <span>Subtitle language</span>
          <input bind:value={subtitleLang} type="text" class="input" style="width:80px" placeholder="en" />
        </div>
      {/if}
    </div>

    <!-- Download button -->
    <button class="btn btn-primary btn-lg w-full" onclick={onDownload}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download
    </button>
  </div>
</div>

<style>
  .video-preview {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 700px) {
    .video-preview { grid-template-columns: 1fr; }
  }

  .thumbnail-container {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface-raised);
    aspect-ratio: 16/9;
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .thumbnail.loaded { opacity: 1; }

  .thumbnail-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-secondary);
  }

  .duration {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0,0,0,0.8);
    color: #fff;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .video-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .platform-tag {
    font-size: 11px;
    font-weight: 700;
    background: var(--accent-glow);
    color: var(--accent);
    padding: 3px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .uploader {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .option-group { display: flex; flex-direction: column; gap: 6px; }
  .option-group.full-width { grid-column: 1 / -1; }
  .option-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }

  .path-input { display: flex; gap: 8px; }
  .path-input .input { flex: 1; cursor: default; }

  .toggles { display: flex; flex-direction: column; gap: 10px; }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    cursor: pointer;
    gap: 12px;
  }
</style>
