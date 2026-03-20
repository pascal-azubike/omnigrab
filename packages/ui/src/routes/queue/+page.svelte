<script lang="ts">
  import { downloadStore } from '$lib/stores/downloads.svelte.js';
  import DownloadItem from '$lib/components/DownloadItem.svelte';
  import QueueItem from '$lib/components/QueueItem.svelte';

  let activeItems = $derived(
    downloadStore.items.filter(i => i.status === 'downloading' || i.status === 'processing' || i.status === 'error')
  );
  
  let queuedItems = $derived(
    downloadStore.items.filter(i => i.status === 'queued')
  );

  let isEmpty = $derived(downloadStore.items.length === 0);

  function handleCancel(id: string) {
    downloadStore.cancelDownload(id);
    downloadStore.removeItem(id);
  }
</script>

<div class="page-container p-6">
  <div class="header-section mb-6">
    <h1 class="text-2xl font-bold">Download Queue</h1>
    <p class="text-secondary">
      {downloadStore.activeCount} active, {downloadStore.queuedCount} queued
    </p>
  </div>

  {#if isEmpty}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </div>
      <h2>Your queue is empty</h2>
      <p>Go to the Home tab to add URLs to download.</p>
      <a href="/" class="btn btn-primary mt-4">Add Download</a>
    </div>
  {:else}
    <div class="queue-layout">
      <!-- Active Section -->
      {#if activeItems.length > 0}
        <div class="section mb-8">
          <h2 class="section-title mb-4">Active Downloads</h2>
          <div class="items-grid">
            {#each activeItems as item (item.id)}
              <div class="animate-fade-in">
                <DownloadItem {item} onCancel={handleCancel} />
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Queued Section -->
      {#if queuedItems.length > 0}
        <div class="section">
          <h2 class="section-title mb-4">Queued ({queuedItems.length})</h2>
          <div class="queued-list flex-col gap-3">
            {#each queuedItems as item, i (item.id)}
              <div class="animate-fade-in">
                <QueueItem {item} position={i + 1} onCancel={handleCancel} />
              </div>
            {/each}
          </div>
        </div>
      {/if}
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

  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
  }

  @media (max-width: 600px) {
    .items-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
