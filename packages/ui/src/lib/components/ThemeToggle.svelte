<script lang="ts">
  import { Sun, Moon, Laptop } from 'lucide-svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  let current = $derived(settingsStore.current);

  function setTheme(theme: 'dark' | 'light' | 'system') {
    settingsStore.updateSettings({ theme });
  }
</script>

<div class="flex flex-col items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-inner">
  <button
    onclick={() => setTheme('light')}
    class="p-2 rounded-xl transition-all {current.theme === 'light' ? 'bg-accent text-amber-500 shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
    title="Light mode"
  >
    <Sun class="h-4 w-4" />
  </button>
  <button
    onclick={() => setTheme('dark')}
    class="p-2 rounded-xl transition-all {current.theme === 'dark' ? 'bg-accent text-indigo-400 shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
    title="Dark mode"
  >
    <Moon class="h-4 w-4" />
  </button>
  <button
    onclick={() => setTheme('system')}
    class="p-2 rounded-xl transition-all {current.theme === 'system' ? 'bg-accent text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}"
    title="System preference"
  >
    <Laptop class="h-4 w-4" />
  </button>
</div>