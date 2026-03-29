<script lang="ts">
  import { List, Trash2, ArrowRight } from "lucide-svelte";
  import { downloadStore } from "$lib/stores/downloads.svelte";
  import DownloadItem from "./DownloadItem.svelte";

  let items = $derived(downloadStore.items);
  let activeItems = $derived(
    items.filter(
      (i) => i.status === "queued" || i.status === "downloading" || i.status === "processing",
    ),
  );
  let completedItems = $derived(
    items.filter(
      (i) =>
        i.status === "complete" ||
        i.status === "error" ||
        i.status === "cancelled",
    ),
  );
</script>

<div
  class="h-full flex flex-col bg-background/50 backdrop-blur-xl border-l border-border animate-in slide-in-from-right-full duration-500"
>
  <div class="p-6 border-b border-border flex items-center justify-between">
    <div class="flex items-center gap-3">
      <List class="h-5 w-5 text-indigo-400" />
      <h2 class="text-sm font-bold text-foreground uppercase tracking-widest">
        Active Queue
      </h2>
    </div>
    <span
      class="px-2 py-1 bg-accent rounded text-[10px] font-bold text-muted-foreground"
    >
      {activeItems.length} ACTIVE
    </span>
  </div>

  <div class="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
    {#if items.length === 0}
      <div
        class="h-full flex flex-col items-center justify-center opacity-20 py-12"
      >
        <List class="h-12 w-12 mb-4" />
        <p class="text-xs font-bold uppercase tracking-widest">
          Queue is empty
        </p>
      </div>
    {:else}
      {#if activeItems.length > 0}
        <div class="space-y-4">
          {#each activeItems as item (item.id)}
            <DownloadItem {item} />
          {/each}
        </div>
      {/if}

      {#if completedItems.length > 0}
        <div class="pt-4 border-t border-border space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3
              class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
            >
              Finished
            </h3>
          </div>
          {#each completedItems as item (item.id)}
            <DownloadItem {item} />
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <div class="p-4 border-t border-border bg-card/30">
    <a
      href="/history"
      class="flex items-center justify-center gap-2 w-full py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
    >
      View Full History
      <ArrowRight class="h-3 w-3" />
    </a>
  </div>
</div>