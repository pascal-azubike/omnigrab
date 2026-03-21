<script lang="ts">
  import UrlInput from '$lib/components/UrlInput.svelte';
  import VideoPreview from '$lib/components/VideoPreview.svelte';
  import PlaylistPreview from '$lib/components/PlaylistPreview.svelte';
  import SiteGrid from '$lib/components/SiteGrid.svelte';
  import type { VideoInfo, PlaylistInfo } from '$lib/types';

  let loadedData = $state<VideoInfo | PlaylistInfo | null>(null);

  function handleLoaded(data: VideoInfo | PlaylistInfo) {
    loadedData = data;
  }
</script>

<div class="space-y-16 animate-in fade-in duration-700">
  <!-- Hero Section -->
  <section class="text-center space-y-6 pt-10">
    <div class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black italic tracking-[0.2em] text-indigo-400 uppercase">
       OmniGrab V2.0 &bull; Dual Target Architecture
    </div>
    
    <div class="space-y-2">
      <h1 class="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">
        Download <span class="text-zinc-500">anything</span><br/>
        from <span class="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">anywhere</span>.
      </h1>
      <p class="text-zinc-500 font-medium md:text-xl max-w-2xl mx-auto">
        Ultra-fast, high-quality video and audio extraction from 1800+ sites. 
        Open source and privacy-focused.
      </p>
    </div>
  </section>

  <!-- Input & Previews -->
  <section class="space-y-8">
    <UrlInput onLoaded={handleLoaded} />

    {#if loadedData}
      <div class="animate-in zoom-in-95 fade-in duration-300">
        {#if 'entries' in loadedData}
          <PlaylistPreview playlist={loadedData} />
        {:else}
          <VideoPreview video={loadedData} />
        {/if}
      </div>
    {/if}
  </section>

  <!-- Site Grid -->
  <section class="pt-10">
    <SiteGrid />
  </section>
  
  <!-- Footer Info -->
  <footer class="pt-20 pb-10 flex flex-col items-center gap-4 border-t border-zinc-900/50">
     <div class="flex items-center gap-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
        <span>MIT License</span>
        <span>&bull;</span>
        <a href="https://github.com/pascal-azubike/omnigrab" target="_blank" class="hover:text-zinc-400 transition-colors">GitHub Repository</a>
        <span>&bull;</span>
        <span>Build 2024.12.21</span>
     </div>
  </footer>
</div>
