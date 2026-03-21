<script lang="ts">
  import { historyStore } from '$lib/stores/history.svelte';
  import HistoryItem from '$lib/components/HistoryItem.svelte';
  import { Trash2 } from 'lucide-svelte';

  let items = $derived(historyStore.items);
</script>

<div class="space-y-12 animate-in fade-in duration-500">
  <header class="flex flex-wrap items-center justify-between gap-6">
    <div class="space-y-2">
      <h1 class="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
        Download <span class="text-zinc-700">History</span>
      </h1>
      <p class="text-zinc-500 font-medium">Manage and access your previously downloaded media.</p>
    </div>

    {#if items.length > 0}
      <button 
        onclick={() => historyStore.clearHistory()}
        class="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all font-bold text-xs uppercase tracking-widest active:scale-95"
      >
        <Trash2 class="h-4 w-4" />
        Clear All
      </button>
    {/if}
  </header>

  <div class="space-y-6">
    {#if items.length === 0}
      <div class="py-40 flex flex-col items-center justify-center text-zinc-800">
        <div class="h-24 w-24 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl">
           <Trash2 class="h-10 w-10" />
        </div>
        <h3 class="text-lg font-black uppercase tracking-widest">No history yet</h3>
        <p class="text-sm font-medium mt-2">Start downloading to build your collection.</p>
      </div>
    {:else}
      {#each items as item (item.id)}
        <HistoryItem {item} />
      {/each}
    {/if}
  </div>
</div>
