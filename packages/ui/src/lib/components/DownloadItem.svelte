<script lang="ts">
  import {
    X,
    Play,
    Pause,
    CheckCircle2,
    AlertCircle,
    Loader2,
  } from "lucide-svelte";
  import type { DownloadItem } from "$lib/stores/downloads.svelte";
  import { downloadStore } from "$lib/stores/downloads.svelte";
  import { formatBytes } from "$lib/utils/formatBytes";

  let { item } = $props<{ item: DownloadItem }>();

  async function handleCancel() {
    await downloadStore.cancelDownload(item.id);
  }

  function handleRemove() {
    downloadStore.removeDownload(item.id);
  }
</script>

<div
  class="bg-card border border-border rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
>
  <div class="p-4 flex items-center gap-4">
    <!-- Thumbnail -->
    <div
      class="h-16 w-16 rounded-xl overflow-hidden bg-accent flex-shrink-0 relative group"
    >
      {#if item.thumbnail}
        <img
          src={item.thumbnail}
          alt={item.title}
          class="w-full h-full object-cover"
        />
      {:else}
        <div
          class="w-full h-full flex items-center justify-center text-muted-foreground"
        >
          <Play class="h-6 w-6" />
        </div>
      {/if}
      {#if item.status === "queued" || item.status === "downloading" || item.status === "processing"}
        <div
          class="absolute inset-0 bg-indigo-600/20 backdrop-blur-[1px] flex items-center justify-center"
        >
          <Loader2 class="h-6 w-6 text-white animate-spin" />
        </div>
      {/if}
    </div>

    <!-- Info & Progress -->
    <div class="flex-grow min-w-0 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="text-sm font-bold text-foreground truncate uppercase tracking-tight leading-none mb-1"
          >
            {item.current_title || item.title}
          </h3>
          <div
            class="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
          >
            <span>{item.format} &bull; {item.quality}</span>
            {#if item.status === "downloading"}
              <span class="text-indigo-400">
                {!isNaN(Number(item.speed))
                  ? `${formatBytes(Number(item.speed))}/s`
                  : item.speed} &bull; {item.eta}
              </span>
            {/if}
          </div>
        </div>

        <button
          onclick={item.status === "complete" || item.status === "error"
            ? handleRemove
            : handleCancel}
          class="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Progress Bar -->
      <div class="space-y-1.5">
        <div class="h-1.5 w-full bg-accent rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-500 transition-all duration-500 ease-out rounded-full"
            style="width: {item.percent}%"
          ></div>
        </div>

        <div
          class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
        >
          <span
            class={item.status === "complete"
              ? "text-emerald-400"
              : item.status === "error"
                ? "text-red-400"
                : item.status === "cancelled"
                  ? "text-muted-foreground"
                  : "text-indigo-400"}
          >
            {item.status === "queued" ? "WAITING" : item.status}
          </span>
          <span class="text-muted-foreground">
            {item.status === "downloading"
              ? `${formatBytes(item.downloaded_bytes)} / ${formatBytes(item.total_bytes)}`
              : `${item.percent}%`}
          </span>
        </div>
      </div>
    </div>
  </div>

  {#if item.status === "error" && item.error}
    <div class="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
      <div
        class="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-[10px] font-medium leading-relaxed"
      >
        <AlertCircle class="h-3 w-3 inline mr-1 -mt-0.5" />
        {item.error}
      </div>
    </div>
  {/if}
</div>