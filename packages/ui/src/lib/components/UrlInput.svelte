<script lang="ts">
  import { Search, Loader2 } from 'lucide-svelte';
  import { getVideoInfo, getPlaylistInfo } from '$lib/utils/api';
  import type { VideoInfo, PlaylistInfo } from '$lib/types';

  let { onLoaded } = $props<{ 
    onLoaded: (data: VideoInfo | PlaylistInfo) => void 
  }>();

  let url = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!url) return;

    loading = true;
    error = null;

    try {
      // Check if it's a playlist
      if (url.includes('list=')) {
        const data = await getPlaylistInfo(url);
        onLoaded(data);
      } else {
        const data = await getVideoInfo(url);
        onLoaded(data);
      }
      url = '';
    } catch (err: any) {
      error = err.message || 'Failed to fetch video information';
    } finally {
      loading = false;
    }
  }
</script>

<div class="w-full max-w-3xl mx-auto space-y-4">
  <form onsubmit={handleSubmit} class="relative group">
    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      {#if loading}
        <Loader2 class="h-5 w-5 text-indigo-400 animate-spin" />
      {:else}
        <Search class="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-400 transition-colors" />
      {/if}
    </div>
    
    <input
      type="text"
      bind:value={url}
      placeholder="Paste YouTube, TikTok, or Instagram link..."
      class="block w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl 
             text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 
             focus:border-indigo-500 transition-all text-lg shadow-xl"
      disabled={loading}
    />
    
    <button
      type="submit"
      disabled={loading || !url}
      class="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 
             disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold 
             rounded-xl transition-all shadow-lg active:scale-95"
    >
      Analyze
    </button>
  </form>

  {#if error}
    <div class="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
      {error}
    </div>
  {/if}
</div>
