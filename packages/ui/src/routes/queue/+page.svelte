<script lang="ts">
  import { downloadStore } from '$lib/stores/downloads.svelte';
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
    downloadStore.removeDownload(id);
  }
</script>

<div class="h-full flex flex-col gap-8 animate-in fade-in duration-500">
  <header class="flex flex-col gap-2">
    <h1 class="text-3xl md:text-5xl font-black italic tracking-tighter leading-none text-foreground">
      Download <span class="text-muted-foreground">Queue</span>
    </h1>
    <p class="text-muted-foreground font-medium text-sm md:text-base">
      {downloadStore.activeCount} active, {downloadStore.queuedCount} queued
    </p>
  </header>

  {#if isEmpty}
    <div class="flex-1 flex flex-col items-center justify-center">
      <div class="h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </div>
      <h3 class="text-lg font-bold text-foreground">Your queue is empty</h3>
      <p class="text-sm font-medium mt-2 text-muted-foreground">Go to the Home tab to add URLs to download.</p>
      <a href="/" class="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">
        Add Download
      </a>
    </div>
  {:else}
    <div class="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-8">
      <!-- Active Section -->
      {#if activeItems.length > 0}
        <div class="space-y-4">
          <h2 class="text-sm font-semibold text-muted-foreground">Active Downloads</h2>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {#each activeItems as item (item.id)}
              <DownloadItem {item} />
            {/each}
          </div>
        </div>
      {/if}

      <!-- Queued Section -->
      {#if queuedItems.length > 0}
        <div class="space-y-4">
          <h2 class="text-sm font-semibold text-muted-foreground">Queued ({queuedItems.length})</h2>
          <div class="flex flex-col gap-3">
            {#each queuedItems as item, i (item.id)}
              <QueueItem {item} position={i + 1} onCancel={handleCancel} />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>