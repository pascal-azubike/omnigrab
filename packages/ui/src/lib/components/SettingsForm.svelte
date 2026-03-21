<script lang="ts">
  import {
    Folder,
    Save,
    Smartphone,
    Laptop,
    Key,
    ShieldCheck,
    RefreshCw,
    Loader2,
  } from "lucide-svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { settingsStore } from "$lib/stores/settings.svelte";
  import { checkYtDlpVersion, openFolder } from "$lib/utils/api";

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
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Download Folder",
      });
      if (selected && typeof selected === "string") {
        settingsStore.updateSettings({ downloadPath: selected });
      }
    } catch (e) {
      console.error("Dialog error:", e);
    }
  }
</script>

<div class="space-y-8">
  <!-- General Section -->
  <section class="space-y-4">
    <div class="flex items-center gap-3 border-b border-border pb-3">
      <div class="p-2 bg-indigo-500/10 rounded-lg">
        <Laptop class="h-5 w-5 text-indigo-500" />
      </div>
      <h2 class="text-base font-semibold text-foreground">
        General Settings
      </h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground pl-1">
          Download Location
        </label>
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={current.downloadPath}
            class="grow bg-card border border-border rounded-xl text-foreground px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-muted-foreground"
            placeholder="Select a folder..."
          />
          <button
            onclick={browseFolder}
            class="p-3 bg-accent hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all"
          >
            <Folder class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground pl-1">
          Concurrent Downloads
        </label>
        <select
          bind:value={current.maxConcurrentDownloads}
          class="w-full bg-card border border-border rounded-xl text-foreground px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
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
  <section class="space-y-4">
    <div class="flex items-center gap-3 border-b border-border pb-3">
      <div class="p-2 bg-emerald-500/10 rounded-lg">
        <ShieldCheck class="h-5 w-5 text-emerald-500" />
      </div>
      <h2 class="text-base font-semibold text-foreground">
        Engine & Sidecars
      </h2>
    </div>

    <div class="bg-card/50 border border-border rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 bg-accent rounded-xl flex items-center justify-center">
          <RefreshCw class="h-5 w-5 text-muted-foreground {ytDlpChecking ? 'animate-spin' : ''}" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-foreground">
            yt-dlp core
          </h3>
          <p class="text-sm text-muted-foreground">
            Version: {current.ytDlpVersion}
          </p>
        </div>
      </div>
      <button
        onclick={handleCheckVersion}
        class="px-5 py-2.5 bg-accent hover:bg-muted text-foreground text-sm font-medium rounded-xl transition-all active:scale-95"
      >
        Check Update
      </button>
    </div>
  </section>

  <!-- Auth Section -->
  <section class="space-y-4">
    <div class="flex items-center gap-3 border-b border-border pb-3">
      <div class="p-2 bg-amber-500/10 rounded-lg">
        <Key class="h-5 w-5 text-amber-500" />
      </div>
      <h2 class="text-base font-semibold text-foreground">
        Authentication
      </h2>
    </div>

    <div class="space-y-4">
      <label class="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:border-amber-500/30 transition-all cursor-pointer group">
        <input
          type="checkbox"
          bind:checked={current.useCookies}
          class="w-5 h-5 rounded border-border text-amber-500 focus:ring-amber-500/50 bg-card"
        />
        <div class="grow">
          <h4 class="text-sm font-semibold text-foreground group-hover:text-amber-400 transition-colors">
            Use Cookies
          </h4>
          <p class="text-sm text-muted-foreground mt-0.5">
            Import cookies for private or age-restricted content (Netscape cookies.txt format)
          </p>
        </div>
      </label>

      {#if current.useCookies}
        <div class="pl-9 space-y-2">
          <label class="text-sm font-medium text-foreground pl-1">
            Cookies File Path
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={current.cookiesPath}
              placeholder="/path/to/cookies.txt"
              class="flex-grow bg-card border border-border rounded-xl text-foreground px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none placeholder:text-muted-foreground"
            />
            <button class="p-3 bg-accent hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
              <Folder class="h-5 w-5" />
            </button>
          </div>
        </div>
      {/if}
    </div>
  </section>
</div>