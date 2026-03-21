<script lang="ts">
  import UrlInput from '$lib/components/UrlInput.svelte';
  import VideoPreview from '$lib/components/VideoPreview.svelte';
  import PlaylistPreview from '$lib/components/PlaylistPreview.svelte';
  import { CloudDownload, Globe } from 'lucide-svelte';
  import type { VideoInfo, PlaylistInfo } from '$lib/types';

  let loadedData = $state<VideoInfo | PlaylistInfo | null>(null);

  function handleLoaded(data: VideoInfo | PlaylistInfo) {
    loadedData = data;
  }
</script>

<div class="h-full min-h-[70vh] flex flex-col gap-8 animate-in fade-in duration-500">
  <!-- App Header -->
  <header class="flex flex-col gap-2">
    <h1 class="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-foreground">
      New <span class="text-muted-foreground">Download</span>
    </h1>
    <p class="text-muted-foreground font-medium text-sm md:text-base">Paste a supported URL to analyze and extract media.</p>
  </header>

  <!-- Input Area -->
  <section class="max-w-4xl w-full">
    <UrlInput onLoaded={handleLoaded} />
  </section>

  <!-- Content Area -->
  {#if loadedData}
    <div class="max-w-4xl w-full animate-in zoom-in-95 fade-in duration-300">
      {#if 'entries' in loadedData}
        <PlaylistPreview playlist={loadedData} />
      {:else}
        <VideoPreview video={loadedData} />
      {/if}
    </div>
  {:else}
    <!-- Empty State -->
    <div class="flex-grow max-w-4xl w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] p-10 py-20 bg-card/20">
      <div class="h-24 w-24 bg-card rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <CloudDownload class="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-black uppercase tracking-widest text-foreground">Ready to Grab</h3>
      <p class="text-sm font-medium mt-2 text-muted-foreground max-w-sm text-center">
        Supports high-quality video and audio extraction from over 1,800 different sites.
      </p>

      <div class="mt-8 flex items-center justify-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/30 px-4 py-2 rounded-xl">
        <Globe class="h-4 w-4" />
        <span>OmniGrab V2.0</span>
      </div>
    </div>
  {/if}
</div>