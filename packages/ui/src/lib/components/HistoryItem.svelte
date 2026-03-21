<script lang="ts">
  import {
    Folder,
    Trash2,
    ExternalLink,
    Calendar,
    FileVideo,
    AlertCircle,
    Loader2,
  } from "lucide-svelte";
  import type { HistoryItem } from "$lib/stores/history.svelte";
  import { historyStore } from "$lib/stores/history.svelte";
  import { openFolder } from "$lib/utils/api";
  import { formatBytes } from "$lib/utils/formatBytes";

  let { item } = $props<{ item: HistoryItem }>();

  async function handleOpenFolder() {
    await openFolder(item.outputPath);
  }

  function handleRemove() {
    historyStore.removeItem(item.id);
  }
</script>

<div
  class="group bg-card/50 border border-border hover:border-muted-foreground/30 transition-all rounded-2xl p-4 flex flex-wrap md:flex-nowrap gap-4 items-center shadow-lg hover:shadow-xl"
>
  <!-- Thumbnail -->
  <div
    class="h-20 w-32 rounded-xl overflow-hidden bg-accent flex-shrink-0 relative"
  >
    <img
      src={item.thumbnail}
      alt={item.title}
      class="w-full h-full object-cover transition-transform group-hover:scale-105"
    />
    <div
      class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
    >
      <FileVideo class="h-6 w-6 text-white/50" />
    </div>
    {#if item.status === "downloading" || item.status === "processing"}
      <div
        class="absolute inset-0 bg-indigo-600/20 backdrop-blur-[1px] flex items-center justify-center"
      >
        <Loader2 class="h-5 w-5 text-white animate-spin" />
      </div>
    {/if}
  </div>

  <!-- Info -->
  <div class="flex-grow min-w-0 space-y-2">
    <div>
      <h3
        class="text-sm font-semibold text-foreground truncate group-hover:text-indigo-400 transition-colors leading-tight"
      >
        {item.title}
      </h3>
      <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
        <span class="text-foreground font-medium">{item.platform}</span>
        <span class="text-border">&bull;</span>
        <span>{item.format} • {item.quality}</span>
        <span class="text-border">&bull;</span>
        <span>{formatBytes(item.fileSize)}</span>
      </div>
    </div>

    <div class="flex items-center gap-3 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5 border border-border px-2 py-1 rounded-md">
        <Calendar class="h-3 w-3" />
        <span>{new Date(item.downloadedAt).toLocaleDateString()}</span>
      </div>
      {#if item.isPlaylist}
        <div class="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md font-medium">
          Playlist • {item.playlistTotal} items
        </div>
      {/if}
      <div
        class="px-2 py-1 rounded-md font-medium {item.status === 'complete'
          ? 'bg-emerald-500/10 text-emerald-500'
          : item.status === 'error'
            ? 'bg-red-500/10 text-red-500'
            : item.status === 'cancelled'
              ? 'bg-muted/10 text-muted-foreground'
              : 'bg-indigo-500/10 text-indigo-400'}"
      >
        {item.status}
      </div>
    </div>

    {#if item.status === "error" && item.error}
      <div
        class="bg-red-500/10 border border-red-500/20 text-red-500 p-2 rounded-lg text-xs"
      >
        <AlertCircle class="h-3 w-3 inline mr-1 -mt-0.5" />
        {item.error}
      </div>
    {/if}
  </div>

  <!-- Actions -->
  <div
    class="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-all"
  >
    <button
      onclick={handleOpenFolder}
      title="Open Folder"
      class="p-3 bg-accent/50 hover:bg-accent hover:text-foreground text-muted-foreground rounded-xl transition-all"
    >
      <Folder class="h-4 w-4" />
    </button>
    <button
      onclick={() => window.open(item.url, "_blank")}
      title="View Source"
      class="p-3 bg-accent/50 hover:bg-accent hover:text-foreground text-muted-foreground rounded-xl transition-all"
    >
      <ExternalLink class="h-4 w-4" />
    </button>
    <button
      onclick={handleRemove}
      title="Delete from History"
      class="p-3 bg-red-500/10 hover:bg-red-500 text-red-500/50 hover:text-white rounded-xl transition-all"
    >
      <Trash2 class="h-4 w-4" />
    </button>
  </div>
</div>