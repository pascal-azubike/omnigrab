<script lang="ts">
  import { Folder, Save, Smartphone, Laptop, Key, ShieldCheck, RefreshCw, Loader2 } from 'lucide-svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { checkYtDlpVersion, openFolder } from '$lib/utils/api';

  let current = $derived(settingsStore.current);
  let ytDlpChecking = $state(false);

  async function handleCheckVersion() {
    ytDlpChecking = true;
    try {
      const info = await checkYtDlpVersion();
      settingsStore.updateSettings({ ytDlpVersion: info.version });
    } finally {
      ytDlpChecking = false;
    }
  }

  async function browseFolder() {
    // In Tauri, call dialog plugin. On Android, maybe no-op or show info.
  }
</script>

<div class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <!-- General Section -->
  <section class="space-y-6">
    <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
      <div class="p-2 bg-indigo-500/10 rounded-lg">
        <Laptop class="h-5 w-5 text-indigo-500" />
      </div>
      <h2 class="text-sm font-bold text-white uppercase tracking-[0.2em]">Application General</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="space-y-3">
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Download Location</label>
        <div class="flex gap-2">
          <input 
            type="text" 
            bind:value={current.downloadPath}
            class="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl text-white px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
          <button 
            onclick={browseFolder}
            class="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
          >
            <Folder class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="space-y-3">
        <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Concurrent Downloads</label>
        <select 
          bind:value={current.maxConcurrentDownloads}
          class="w-full bg-zinc-900 border border-zinc-800 rounded-xl text-white px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
        >
          <option value={1}>1 (Safest)</option>
          <option value={3}>3 (Recommended)</option>
          <option value={5}>5 (High Performance)</option>
          <option value={10}>10 (Extreme)</option>
        </select>
      </div>
    </div>
  </section>

  <!-- Sidecar Section -->
  <section class="space-y-6">
    <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
      <div class="p-2 bg-emerald-500/10 rounded-lg">
        <ShieldCheck class="h-5 w-5 text-emerald-500" />
      </div>
      <h2 class="text-sm font-bold text-white uppercase tracking-[0.2em]">Engine & Sidecars</h2>
    </div>

    <div class="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
          <RefreshCw class="h-6 w-6 text-zinc-500 {ytDlpChecking ? 'animate-spin' : ''}" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-white uppercase tracking-tight">yt-dlp core</h3>
          <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Version: {current.ytDlpVersion}</p>
        </div>
      </div>
      <button 
        onclick={handleCheckVersion}
        class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95"
      >
        Check Update
      </button>
    </div>
  </section>

  <!-- Auth Section -->
  <section class="space-y-6">
    <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
      <div class="p-2 bg-amber-500/10 rounded-lg">
        <Key class="h-5 w-5 text-amber-500" />
      </div>
      <h2 class="text-sm font-bold text-white uppercase tracking-[0.2em]">Authentication</h2>
    </div>

    <div class="space-y-6">
      <label class="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30 transition-all cursor-pointer group">
        <input type="checkbox" bind:checked={current.useCookies} class="w-5 h-5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500/50 bg-zinc-900" />
        <div class="flex-grow">
          <h4 class="text-sm font-bold text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">Use Cookies</h4>
          <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Import cookies for private or age-restricted content (supports Netscape cookies.txt format)</p>
        </div>
      </label>

      {#if current.useCookies}
        <div class="pl-9 space-y-3 animate-in fade-in slide-in-from-top-2">
           <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Cookies File Path</label>
           <div class="flex gap-2">
             <input 
               type="text" 
               bind:value={current.cookiesPath}
               placeholder="/path/to/cookies.txt"
               class="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl text-white px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
             />
             <button 
               class="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
             >
               <Folder class="h-5 w-5" />
             </button>
           </div>
        </div>
      {/if}
    </div>
  </section>
</div>
