<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { open } from '@tauri-apps/plugin-shell';
  import { onMount } from 'svelte';
  
  // Hardcoded for now, could be pulled from package.json
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

<div class="page-container p-6 max-w-[600px] mx-auto text-center mt-8">
  <div class="brand mb-8 animate-fade-in">
    <div class="logo-box mx-auto mb-6">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    </div>
    <h1 class="text-4xl font-bold mb-2">OmniGrab</h1>
    <p class="text-secondary tracking-widest uppercase text-sm font-semibold">Version {APP_VERSION}</p>
  </div>

  <div class="card text-left mb-8">
    <h2 class="font-bold mb-4 border-b border-(--border) pb-2">Dependencies</h2>

    <div class="dep-row">
      <div>
        <div class="font-medium">yt-dlp core</div>
        <div class="text-xs text-secondary mt-1">
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
        class="btn btn-secondary btn-sm" 
        disabled={checking || updating}
        onclick={handleUpdate}
      >
        {updating ? 'Updating...' : 'Update Core'}
      </button>
    </div>
    
    {#if updateError}
      <div class="text-error text-xs mt-2 bg-(--error-bg) p-2 rounded">
        {updateError}
      </div>
    {/if}

    <div class="divider"></div>

    <div class="dep-row">
      <div>
        <div class="font-medium">ffmpeg</div>
        <div class="text-xs text-secondary mt-1">Bundled standard build</div>
      </div>
    </div>
  </div>

  <div class="links flex flex-col gap-3">
    <button class="btn btn-ghost" onclick={() => openLink('https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
      View 1800+ Supported Sites
    </button>
    
    <button class="btn btn-ghost" onclick={() => openLink('https://github.com/yt-dlp/yt-dlp')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
      Powered by yt-dlp
    </button>
  </div>
  
  <p class="mt-12 text-xs text-secondary">
    OmniGrab is open source software released under the MIT License.<br/>
    Do not use this software to download copyrighted content without permission.
  </p>
</div>

<style>
  .logo-box {
    width: 120px;
    height: 120px;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 12px 30px rgba(0,0,0,0.2);
  }

  .dep-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
