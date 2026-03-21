<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-shell';
  import { onMount } from 'svelte';

  const APP_VERSION = '1.0.0';

  let ytDlpVersion = $state<any>(null);
  let checking = $state(true);
  let updating = $state(false);
  let updateError = $state('');

  onMount(async () => {
    try {
      ytDlpVersion = await invoke('check_yt_dlp_version');
    } catch (e: any) {
      updateError = e.toString();
    } finally {
      checking = false;
    }
  });

  async function handleUpdate() {
    updating = true;
    updateError = '';
    try {
      await invoke('update_yt_dlp');
      ytDlpVersion = await invoke('check_yt_dlp_version');
      alert('yt-dlp updated successfully!');
    } catch (e: any) {
      updateError = e.toString();
    } finally {
      updating = false;
    }
  }

  function openLink(url: string) {
    open(url);
  }
</script>

<div class="h-full flex flex-col gap-8 animate-in fade-in duration-500 max-w-2xl mx-auto text-center">
  <header class="flex flex-col items-center gap-4">
    <div class="h-20 w-20 bg-card border-2 border-border rounded-2xl flex items-center justify-center shadow-xl">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-500">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </div>
    <h1 class="text-3xl md:text-5xl font-black italic tracking-tighter text-foreground">
      OmniGrab
    </h1>
    <p class="text-muted-foreground font-medium">Version {APP_VERSION}</p>
  </header>

  <div class="bg-card/50 border border-border rounded-2xl p-6 text-left space-y-4">
    <h2 class="text-base font-semibold text-foreground border-b border-border pb-3">Dependencies</h2>

    <div class="flex justify-between items-center">
      <div>
        <div class="font-medium text-foreground">yt-dlp core</div>
        <div class="text-sm text-muted-foreground">
          {#if checking}
            Checking version...
          {:else if ytDlpVersion}
            Current: <span class="font-mono">{ytDlpVersion.current}</span>
          {:else}
            Version check failed
          {/if}
        </div>
      </div>

      <button
        class="px-4 py-2 bg-accent hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium rounded-xl transition-all disabled:opacity-50"
        disabled={checking || updating}
        onclick={handleUpdate}
      >
        {updating ? 'Updating...' : 'Update Core'}
      </button>
    </div>

    {#if updateError}
      <div class="text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
        {updateError}
      </div>
    {/if}

    <div class="border-t border-border pt-4">
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium text-foreground">ffmpeg</div>
          <div class="text-sm text-muted-foreground">Bundled standard build</div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-3">
    <button
      class="flex items-center justify-center gap-3 w-full px-4 py-3 bg-card/50 hover:bg-card border border-border rounded-xl transition-all text-foreground"
      onclick={() => openLink('https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      View 1800+ Supported Sites
    </button>

    <button
      class="flex items-center justify-center gap-3 w-full px-4 py-3 bg-card/50 hover:bg-card border border-border rounded-xl transition-all text-foreground"
      onclick={() => openLink('https://github.com/yt-dlp/yt-dlp')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
      Powered by yt-dlp
    </button>
  </div>

  <p class="text-sm text-muted-foreground mt-4">
    OmniGrab is open source software released under the MIT License.<br/>
    Do not use this software to download copyrighted content without permission.
  </p>
</div>