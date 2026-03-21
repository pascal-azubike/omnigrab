<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { getPlatform } from '$lib/utils/platform';
  import { settingsStore } from '$lib/stores/settings.svelte.js';
  import { downloadStore } from '$lib/stores/downloads.svelte.js';
  import { historyStore } from '$lib/stores/history.svelte.js';

  let { children } = $props();

  let isInitialized = $state(false);
  let appVersion = $state('1.0.0');
  let platform = $state<'desktop' | 'android-webview' | 'browser'>('browser');

  onMount(() => {
    (async () => {
      try {
        platform = await getPlatform();

        await settingsStore.init();
        await historyStore.init();
        await downloadStore.init();

        // Only fetch version on desktop — on Android it's bundled in pyproject.toml
        if (platform === 'desktop') {
          const { getVersion } = await import('@tauri-apps/api/app');
          appVersion = await getVersion();
        }

        isInitialized = true;
      } catch (e) {
        console.error('Failed to initialize app stores:', e);
        isInitialized = true; // Still render even if init partially fails
      }
    })();
    return () => downloadStore.cleanup();
  });

  const navItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/queue', label: 'Queue', icon: 'list' },
    { path: '/history', label: 'History', icon: 'clock' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];
</script>

{#if !isInitialized}
  <div class="splash-screen">
    <div class="logo-spinner"></div>
    <p>Loading OmniGrab...</p>
  </div>
{:else}
  <div class="app-layout">
    <!-- Desktop Sidebar (only shown when NOT in Android WebView) -->
    {#if platform !== 'android-webview'}
      <aside class="sidebar" data-tauri-drag-region>
        <div class="brand" data-tauri-drag-region>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <h1>OmniGrab</h1>
        </div>

        <nav class="nav">
          {#each navItems as item}
            {@const isActive = page.url.pathname === item.path || (item.path !== '/' && page.url.pathname.startsWith(item.path))}
            <a href={item.path} class="nav-item" class:active={isActive}>
              <div class="nav-icon">
                {#if item.icon === 'home'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                {:else if item.icon === 'list'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  {#if downloadStore.activeCount > 0}
                    <span class="nav-badge animate-pulse">{downloadStore.activeCount}</span>
                  {/if}
                {:else if item.icon === 'clock'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                {:else if item.icon === 'settings'}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                {/if}
              </div>
              <span class="nav-label">{item.label}</span>
            </a>
          {/each}
        </nav>

        <div class="sidebar-footer">
          <a href="/about" class="about-link" class:active={page.url.pathname === '/about'}>v{appVersion}</a>
        </div>
      </aside>
    {/if}

    <!-- Main Content -->
    <main class="main-content">
      {#key page.url.pathname}
        <div class="page-transition">
          {@render children()}
        </div>
      {/key}
    </main>

    <!-- Mobile Bottom Navigation — only shown in Android WebView -->
    {#if platform === 'android-webview'}
      <nav class="mobile-nav" aria-label="Main navigation">
        {#each navItems as item}
          {@const isActive = page.url.pathname === item.path || (item.path !== '/' && page.url.pathname.startsWith(item.path))}
          <a href={item.path} class="mobile-nav-item" class:active={isActive} aria-label={item.label}>
            {#if item.icon === 'home'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            {:else if item.icon === 'list'}
              <div style="position:relative; display:inline-flex;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                </svg>
                {#if downloadStore.activeCount > 0}
                  <span class="mobile-nav-badge">{downloadStore.activeCount}</span>
                {/if}
              </div>
            {:else if item.icon === 'clock'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            {:else if item.icon === 'settings'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33H13a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 2.68 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            {/if}
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    {/if}

  </div>
{/if}

<style>
  .splash-screen {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    gap: 20px;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .logo-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s infinite linear;
  }

  .app-layout {
    display: flex;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--bg);
    position: relative;
  }

  /* Desktop Sidebar */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    z-index: 50;
    flex-shrink: 0;
  }

  .brand {
    height: 80px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;
    border-bottom: 1px solid var(--border);
  }

  .brand h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .nav {
    flex: 1;
    padding: 24px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    transition: all var(--transition-fast);
    position: relative;
  }

  .nav-item:hover { background: var(--surface-raised); color: var(--text-primary); }
  .nav-item.active { background: var(--accent-glow); color: var(--accent); }

  .nav-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-badge {
    position: absolute;
    top: -6px;
    right: -8px;
    background: var(--accent);
    color: white;
    font-size: 10px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid var(--surface);
  }

  .sidebar-footer {
    padding: 24px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: center;
  }

  .about-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.2s;
  }

  .about-link:hover, .about-link.active { color: var(--accent); }

  /* Main Content */
  .main-content {
    flex: 1;
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg);
    min-width: 0;
  }

  .page-transition {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    animation: fade-in 0.3s ease;
  }

  /* Mobile Bottom Nav Badge */
  .mobile-nav-badge {
    position: absolute;
    top: -6px;
    right: -8px;
    background: var(--accent);
    color: white;
    font-size: 9px;
    font-weight: 700;
    min-width: 14px;
    height: 14px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
  }
</style>
