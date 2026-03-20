<script lang="ts">
  import { detectPlatform, isPlaylistUrl } from '$lib/utils/platform.js';

  interface Props {
    value?: string;
    onsubmit: (url: string, isPlaylist: boolean) => void;
    loading?: boolean;
  }

  let { value = $bindable(''), onsubmit, loading = false }: Props = $props();

  let inputEl = $state<HTMLInputElement>();
  let detected = $derived(value ? detectPlatform(value) : null);
  let isPlaylist = $derived(value ? isPlaylistUrl(value) : false);

  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') || '';
    if (text.startsWith('http')) {
      value = text.trim();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const url = value.trim();
    if (!url || loading) return;
    onsubmit(url, isPlaylist);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Native paste handled by onpaste
    }
  }
</script>

<div class="url-input-wrapper">
  <div class="url-input-container" class:has-url={!!value} class:loading>
    <!-- Platform badge -->
    {#if detected}
      <div class="platform-badge" style="--p: {detected.color}">
        <img
          src="/platform-icons/{detected.icon}.svg"
          alt={detected.name}
          width="20"
          height="20"
          onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span class="platform-name">{detected.name}</span>
        {#if isPlaylist}
          <span class="playlist-badge">Playlist</span>
        {/if}
      </div>
    {:else if value}
      <div class="globe-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
          <path d="M2 12h20"/>
        </svg>
        <span class="platform-name">Unknown Platform</span>
      </div>
    {:else}
      <div class="input-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </div>
    {/if}

    <input
      bind:this={inputEl}
      bind:value
      type="url"
      class="url-input"
      placeholder="Paste any video or playlist URL..."
      onpaste={handlePaste}
      onkeydown={handleKeydown}
      disabled={loading}
      autocomplete="off"
      spellcheck={false}
    />

    <!-- Spinner or clear button -->
    {#if loading}
      <div class="spinner">
        <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
    {:else if value}
      <button class="clear-btn" onclick={() => { value = ''; inputEl?.focus(); }} aria-label="Clear URL">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    {/if}

    <button
      class="fetch-btn btn btn-primary"
      onclick={handleSubmit}
      disabled={!value.trim() || loading}
    >
      {loading ? 'Fetching...' : 'Fetch'}
    </button>
  </div>

  <p class="hint">Supports 1800+ platforms · Ctrl+V to paste · Press Enter</p>
</div>

<style>
  .url-input-wrapper {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
  }

  .url-input-container {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 8px 8px 8px 16px;
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }

  .url-input-container:focus-within,
  .url-input-container.has-url {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-glow);
  }

  .platform-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: color-mix(in srgb, var(--p) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--p) 30%, transparent);
    border-radius: 8px;
    padding: 4px 10px 4px 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .globe-icon, .input-icon {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    flex-shrink: 0;
    padding: 0 4px;
  }

  .platform-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .playlist-badge {
    font-size: 10px;
    font-weight: 700;
    background: var(--accent-glow);
    color: var(--accent);
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .url-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    color: var(--text-primary);
    font-family: inherit;
    min-width: 0;
  }

  .url-input::placeholder { color: var(--text-secondary); }
  .url-input:disabled { opacity: 0.6; }

  .spinner {
    color: var(--accent);
    flex-shrink: 0;
    display: flex;
  }

  .clear-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    transition: color 150ms;
    flex-shrink: 0;
  }
  .clear-btn:hover { color: var(--text-primary); }

  .fetch-btn {
    flex-shrink: 0;
    font-size: 14px;
    padding: 10px 20px;
    border-radius: 10px;
  }

  .hint {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 10px;
  }
</style>
