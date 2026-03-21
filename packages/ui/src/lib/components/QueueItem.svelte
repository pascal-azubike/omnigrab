<script lang="ts">
  import type { DownloadItem as IDownloadItem } from "$lib/stores/downloads.svelte.js";
  import { getPlatform } from "$lib/utils/platform.js";

  interface Props {
    item: IDownloadItem;
    position: number;
    onCancel: (id: string) => void;
  }

  let { item, position, onCancel }: Props = $props();

  let platformName = $state("Unknown");
  $effect(() => {
    getPlatform().then((p) => {
      platformName =
        p === "desktop"
          ? "Desktop"
          : p === "android-webview"
            ? "Android"
            : "Browser";
    });
  });
</script>

<div
  class="flex items-center gap-4 p-4 bg-card/50 border border-border rounded-2xl group transition-all hover:bg-card hover:border-muted-foreground/30 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4"
>
  <div
    class="shrink-0 w-6 h-6 bg-accent rounded-lg flex items-center justify-center text-[10px] font-black text-muted-foreground"
  >
    #{position}
  </div>

  <div
    class="shrink-0 w-20 h-11 rounded-xl overflow-hidden bg-accent shadow-inner"
  >
    {#if item.thumbnail}
      <img
        src={item.thumbnail}
        alt=""
        class="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center">
        <div
          class="w-4 h-4 rounded-full border-2 border-muted-foreground/50 animate-pulse"
        ></div>
      </div>
    {/if}
  </div>

  <div class="grow min-w-0">
    <h4
      class="text-sm font-bold text-foreground truncate leading-tight mb-1"
      title={item.title}
    >
      {item.title}
    </h4>
    <div
      class="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
    >
      <span class="text-foreground">{item.quality} &bull; {item.format}</span>
      {#if item.is_playlist}
        <span>&bull;</span>
        <span class="text-indigo-400"
          >Playlist ({item.playlist_total || "?"})</span
        >
      {/if}
    </div>
    <div
      class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 animate-pulse"
    >
      Waiting to start...
    </div>
  </div>

  <button
    class="p-2.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all active:scale-90"
    onclick={() => onCancel(item.id)}
    title="Remove from queue"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
</div>