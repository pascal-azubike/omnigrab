<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.svelte.js';

  let theme = $derived(settingsStore.settings.theme);

  const THEMES = [
    { value: 'light', icon: 'sun', label: 'Light' },
    { value: 'dark', icon: 'moon', label: 'Dark' },
    { value: 'system', icon: 'monitor', label: 'System' },
  ] as const;

  function setTheme(t: typeof THEMES[number]['value']) {
    settingsStore.update({ theme: t });
  }
</script>

<div class="theme-toggle">
  {#each THEMES as t}
    <button
      class="theme-btn"
      class:active={theme === t.value}
      onclick={() => setTheme(t.value)}
      title={t.label}
      aria-label="{t.label} theme"
    >
      {#if t.icon === 'sun'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else if t.icon === 'moon'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      {/if}
      <span class="sr-only">{t.label}</span>
      {#if theme === t.value}
        <span class="active-indicator" style="view-transition-name: theme-indicator"></span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .theme-toggle {
    display: inline-flex;
    background: var(--surface-raised);
    padding: 4px;
    border-radius: 20px;
    border: 1px solid var(--border);
  }

  .theme-btn {
    position: relative;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 16px;
    cursor: pointer;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
  }

  .theme-btn:hover {
    color: var(--text-primary);
  }

  .theme-btn.active {
    color: var(--text-primary);
  }

  .active-indicator {
    position: absolute;
    inset: 0;
    background: var(--surface);
    border-radius: 16px;
    z-index: -1;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  @media (max-width: 768px) {
    .theme-btn { padding: 8px; }
  }
</style>
