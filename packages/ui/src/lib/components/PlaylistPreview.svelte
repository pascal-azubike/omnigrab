<script lang="ts">
  import { Download, CheckCircle2, Circle, ListVideo } from 'lucide-svelte';
  import type { PlaylistInfo } from '$lib/types';
  import { startDownload } from '$lib/utils/api';
  import { downloadStore } from '$lib/stores/downloads.svelte';
  import { v4 as uuidv4 } from 'uuid';

  let { playlist } = $props<{ playlist: PlaylistInfo }>();

  let selectedIndices = $state<number[]>(playlist.entries.map(e => e.index));
  let quality = $state('best');
  let format = $state('mp4');

  function toggleSelect(index: number) {
    if (selectedIndices.includes(index)) {
      selectedIndices = selectedIndices.filter(i => i !== index);
    } else {
      selectedIndices = [...selectedIndices, index];
    }
  }

  function toggleAll() {
    if (selectedIndices.length === playlist.entries.length) {
      selectedIndices = [];
    } else {
      selectedIndices = playlist.entries.map(e => e.index);
    }
  }

  async function handleDownload() {
    if (selectedIndices.length === 0) return;

    const id = uuidv4();
    const payload = {
      id,
      url: playlist.entries[0].url, // use the first entry URL as a base or the playlist URL if available
      quality,
      format,
      embed_thumbnail: true,
      embed_metadata: true,
      download_subtitles: false,
      subtitle_lang: 'en',
      is_playlist: true,
      playlist_items: selectedIndices.join(',')
    };

    await downloadStore.addDownload(payload);
    await startDownload(payload);
  }
</script>

<div class="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
  <div class="p-8 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-6">
    <div class="flex items-center gap-6">
      <div class="h-20 w-20 rounded-2xl overflow-hidden shadow-lg border border-zinc-800">
        <img src={playlist.playlist_thumbnail} alt={playlist.playlist_title} class="w-full h-full object-cover" />
      </div>
      <div>
        <h2 class="text-2xl font-bold text-white leading-tight">{playlist.playlist_title}</h2>
        <p class="text-zinc-400 font-medium">{playlist.playlist_uploader} &bull; {playlist.total_count} videos</p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Quality</label>
        <select bind:value={quality} class="bg-zinc-800 border-none rounded-xl text-white px-3 py-2 text-sm outline-none">
          <option value="best">Best</option>
          <option value="1080">1080p</option>
          <option value="720">720p</option>
          <option value="audio">Audio</option>
        </select>
      </div>
      
      <button 
        onclick={handleDownload}
        disabled={selectedIndices.length === 0}
        class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl transition-all shadow-xl flex items-center gap-2 active:scale-95"
      >
        <Download class="h-5 w-5" />
        Download {selectedIndices.length} items
      </button>
    </div>
  </div>

  <div class="max-h-[500px] overflow-y-auto custom-scrollbar">
    <div class="p-4 space-y-2">
      <button 
        onclick={toggleAll}
        class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
      >
        <div class="flex items-center gap-3">
          {#if selectedIndices.length === playlist.entries.length}
            <CheckCircle2 class="h-5 w-5 text-indigo-500" />
          {:else if selectedIndices.length > 0}
            <div class="h-5 w-5 bg-indigo-500/20 rounded flex items-center justify-center">
              <div class="w-2.5 h-0.5 bg-indigo-500 rounded-full"></div>
            </div>
          {:else}
            <Circle class="h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
          {/if}
          <span class="text-sm font-bold text-white">Select All</span>
        </div>
        <span class="text-xs font-medium text-zinc-500">{selectedIndices.length}/{playlist.entries.length} selected</span>
      </button>

      {#each playlist.entries as entry}
        <button 
          onclick={() => toggleSelect(entry.index)}
          class="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group {selectedIndices.includes(entry.index) ? 'bg-zinc-800/30' : ''}"
        >
          <div class="flex-shrink-0">
            {#if selectedIndices.includes(entry.index)}
              <CheckCircle2 class="h-5 w-5 text-indigo-500" />
            {:else}
              <Circle class="h-5 w-5 text-zinc-600 group-hover:text-zinc-400" />
            {/if}
          </div>
          
          <div class="h-12 w-20 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
            <img src={entry.thumbnail} alt={entry.title} class="w-full h-full object-cover" />
          </div>

          <div class="flex-grow text-left overflow-hidden">
            <h4 class="text-sm font-medium text-white line-clamp-1 group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none mb-1">
              {entry.title}
            </h4>
            <div class="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase">
              <span>#{entry.index}</span>
              <span>&bull;</span>
              <span>{Math.floor(entry.duration / 60)}:{(entry.duration % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
