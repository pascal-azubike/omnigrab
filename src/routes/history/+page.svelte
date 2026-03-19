<script lang="ts">
  import { historyStore } from '$lib/stores/history.svelte.js';
  import { invoke } from '@tauri-apps/api/core';
  import HistoryItem from '$lib/components/HistoryItem.svelte';

  let searchQuery = $state('');
  
  let items = $derived(historyStore.search(searchQuery));
  let isEmpty = $derived(historyStore.items.length === 0);

  function handleOpenFile(path: string) {
    if (!path) return;
    invoke('open_folder', { path }).catch(console.error);
  }

  function handleOpenFolder(folder: string) {
    if (!folder) return;
    invoke('open_folder', { path: folder }).catch(console.error);
  }

  function handleRemove(id: string) {
    historyStore.removeItem(id);
  }

  function handleClearAll() {
    if (confirm('Are you sure you want to clear all history? This will not delete the downloaded files.')) {
      historyStore.clearAll();
    }
  }

  function handleRedownload(url: string) {
    navigator.clipboard.writeText(url);
    alert('URL copied to clipboard! Go to Home to download again.');
  }
</script>

<div class="page-container p-6">
  <div class="header-section mb-6">
    <div>
      <h1 class="text-2xl font-bold">History</h1>
      <p class="text-secondary">{historyStore.items.length} completed downloads</p>
    </div>

    {#if !isEmpty}
      <div class="actions flex items-center gap-4">
        <div class="search-box relative">
          <svg class="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-secondary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            bind:value={searchQuery}
            type="text"
            class="input pl-9"
            placeholder="Search titles or platforms..."
          />
        </div>
        <button class="btn btn-ghost text-error" onclick={handleClearAll}>Clear All</button>
      </div>
    {/if}
  </div>

  {#if isEmpty}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <h2>No download history</h2>
      <p>Your completed downloads will appear here.</p>
    </div>
  {:else if items.length === 0}
    <div class="empty-state">
      <h2>No results found for "{searchQuery}"</h2>
      <button class="btn btn-ghost mt-4" onclick={() => searchQuery = ''}>Clear Search</button>
    </div>
  {:else}
    <div class="history-list flex-col gap-4">
      {#each items as item (item.id)}
        <HistoryItem
          {item}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onRemove={handleRemove}
          onRedownload={handleRedownload}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .search-box { width: 250px; }

  @media (max-width: 600px) {
    .search-box { width: 100%; flex: 1; }
    .actions { width: 100%; }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 200px);
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-icon {
    width: 96px;
    height: 96px;
    background: var(--surface-raised);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
    color: var(--border);
  }

  .empty-state h2 {
    color: var(--text-primary);
    margin-bottom: 8px;
  }
</style>
