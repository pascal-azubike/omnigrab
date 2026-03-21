<script lang="ts">
  import { Folder, Trash2, ExternalLink, Calendar, FileVideo } from 'lucide-svelte';
  import type { HistoryItem } from '$lib/stores/history.svelte';
  import { historyStore } from '$lib/stores/history.svelte';
  import { openFolder } from '$lib/utils/api';
  import { formatBytes } from '$lib/utils/formatBytes';

  let { item } = $props<{ item: HistoryItem }>();

  async function handleOpenFolder() {
    await openFolder(item.outputPath);
  }

  function handleRemove() {
    historyStore.removeItem(item.id);
  }
</script>

<div class="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all rounded-3xl p-5 flex flex-wrap md:flex-nowrap gap-6 items-center shadow-lg hover:shadow-2xl">
  <!-- Thumbnail -->
  <div class="h-24 w-40 rounded-2xl overflow-hidden bg-zinc-800 flex-shrink-0 relative group-hover:shadow-indigo-500/10 transition-shadow">
    <img src={item.thumbnail} alt={item.title} class="w-full h-full object-cover transition-transform group-hover:scale-105" />
    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
      <FileVideo class="h-8 w-8 text-white/50" />
    </div>
  </div>

  <!-- Info -->
  <div class="flex-grow min-w-0 space-y-3">
    <div>
      <h3 class="text-lg font-bold text-white truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none mb-1">
        {item.title}
      </h3>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        <span class="text-zinc-300">{item.platform}</span>
        <span>&bull;</span>
        <span>{item.format} &bull; {item.quality}</span>
        <span>&bull;</span>
        <span>{formatBytes(item.fileSize)}</span>
      </div>
    </div>

    <div class="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
      <div class="flex items-center gap-1.5 border border-zinc-800 px-2 py-1 rounded-md">
        <Calendar class="h-3 w-3" />
        {new Date(item.downloadedAt).toLocaleDateString()}
      </div>
      {#if item.isPlaylist}
        <div class="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md">
          Playlist &bull; {item.playlistTotal} items
        </div>
      {/if}
    </div>
  </div>

  <!-- Actions -->
  <div class="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
    <button 
      onclick={handleOpenFolder}
      title="Open Folder"
      class="p-4 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white text-zinc-400 rounded-2xl transition-all"
    >
      <Folder class="h-5 w-5" />
    </button>
    <button 
      onclick={() => window.open(item.url, '_blank')}
      title="View Source"
      class="p-4 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white text-zinc-400 rounded-2xl transition-all"
    >
      <ExternalLink class="h-5 w-5" />
    </button>
    <button 
      onclick={handleRemove}
      title="Delete from History"
      class="p-4 bg-red-500/10 hover:bg-red-500 text-red-500/50 hover:text-white rounded-2xl transition-all"
    >
      <Trash2 class="h-5 w-5" />
    </button>
  </div>
</div>
