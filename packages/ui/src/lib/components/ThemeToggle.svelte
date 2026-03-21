<script lang="ts">
  import { Sun, Moon, Laptop } from 'lucide-svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  let current = $derived(settingsStore.current);

  function setTheme(theme: 'dark' | 'light' | 'system') {
    settingsStore.updateSettings({ theme });
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }
</script>

<div class="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1 shadow-inner">
  <button 
    onclick={() => setTheme('light')}
    class="p-2 rounded-xl transition-all {current.theme === 'light' ? 'bg-zinc-800 text-amber-500 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}"
  >
    <Sun class="h-4 w-4" />
  </button>
  <button 
    onclick={() => setTheme('dark')}
    class="p-2 rounded-xl transition-all {current.theme === 'dark' ? 'bg-zinc-800 text-indigo-400 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}"
  >
    <Moon class="h-4 w-4" />
  </button>
  <button 
    onclick={() => setTheme('system')}
    class="p-2 rounded-xl transition-all {current.theme === 'system' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}"
  >
    <Laptop class="h-4 w-4" />
  </button>
</div>
