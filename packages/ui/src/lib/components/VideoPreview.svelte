<script lang="ts">
  import { Download, Film, Type, Image, Music } from 'lucide-svelte';
  import type { VideoInfo } from '$lib/types';
  import { startDownload } from '$lib/utils/api';
  import { downloadStore } from '$lib/stores/downloads.svelte';
  import { v4 as uuidv4 } from 'uuid';

  let { video } = $props<{ video: VideoInfo }>();

  let quality = $state('best');
  let format = $state('mp4');
  let embedThumbnail = $state(true);
  let embedMetadata = $state(true);
  let downloadSubtitles = $state(false);
  let subtitleLang = $state('en');

  async function handleDownload() {
    const id = uuidv4();
    const payload = {
      id,
      url: video.webpage_url,
      quality,
      format,
      embed_thumbnail: embedThumbnail,
      embed_metadata: embedMetadata,
      download_subtitles: downloadSubtitles,
      subtitle_lang: subtitleLang,
      is_playlist: false
    };

    await downloadStore.addDownload(payload);
    await startDownload(payload);
  }
</script>

<div class="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 p-8">
    <!-- Thumbnail & Info -->
    <div class="lg:col-span-2 space-y-4">
      <div class="relative group rounded-2xl overflow-hidden aspect-video shadow-lg">
        <img src={video.thumbnail} alt={video.title} class="w-full h-full object-cover transition-transform group-hover:scale-105" />
        <div class="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-xs text-white font-medium">
          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
        </div>
      </div>
      
      <div class="space-y-2">
        <h2 class="text-xl font-bold text-white leading-tight line-clamp-2">{video.title}</h2>
        <div class="flex items-center gap-3 text-zinc-400 text-sm">
          <span class="px-2 py-0.5 bg-zinc-800 rounded text-xs font-semibold uppercase">{video.platform}</span>
          <span>&bull;</span>
          <span>{video.uploader}</span>
        </div>
      </div>
    </div>

    <!-- Options -->
    <div class="lg:col-span-2 space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
            <Film class="h-3 w-3" /> Quality
          </label>
          <select bind:value={quality} class="w-full bg-zinc-800 border-none rounded-xl text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none">
            <option value="best">Best Available</option>
            <option value="2160">4K (2160p)</option>
            <option value="1080">1080p Full HD</option>
            <option value="720">720p HD</option>
            <option value="480">480p</option>
            <option value="360">360p</option>
            <option value="audio">Audio Only</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
            <Music class="h-3 w-3" /> Format
          </label>
          <select bind:value={format} class="w-full bg-zinc-800 border-none rounded-xl text-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none">
            {#if quality === 'audio'}
              <option value="mp3">MP3</option>
              <option value="m4a">M4A (Apple)</option>
              <option value="flac">FLAC (Lossless)</option>
              <option value="wav">WAV</option>
            {:else}
              <option value="mp4">MP4 (Universal)</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
            {/if}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group">
          <input type="checkbox" bind:checked={embedThumbnail} class="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500/50" />
          <div class="flex items-center gap-2 text-sm text-zinc-300">
            <Image class="h-4 w-4 text-zinc-500 group-hover:text-indigo-400" /> Embed Thumbnail
          </div>
        </label>
        
        <label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group">
          <input type="checkbox" bind:checked={embedMetadata} class="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500/50" />
          <div class="flex items-center gap-2 text-sm text-zinc-300">
            <Type class="h-4 w-4 text-zinc-500 group-hover:text-indigo-400" /> Write Metadata
          </div>
        </label>
      </div>

      {#if quality !== 'audio'}
        <div class="space-y-3 pt-2">
          <label class="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer group">
            <input type="checkbox" bind:checked={downloadSubtitles} class="w-4 h-4 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500/50" />
            <div class="flex items-center gap-2 text-sm text-zinc-300">
              <Type class="h-4 w-4 text-zinc-500 group-hover:text-indigo-400" /> Download Subtitles
            </div>
          </label>
          
          {#if downloadSubtitles}
            <div class="pl-7 animate-in fade-in slide-in-from-top-1">
              <input type="text" bind:value={subtitleLang} placeholder="en, es, ja..." class="w-full bg-zinc-800 border-none rounded-xl text-white px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none" />
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Download CTA -->
    <div class="flex flex-col justify-end lg:col-span-1">
      <button 
        onclick={handleDownload}
        class="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95 flex flex-col items-center gap-2"
      >
        <Download class="h-6 w-6" />
        Start Download
      </button>
    </div>
  </div>
</div>
