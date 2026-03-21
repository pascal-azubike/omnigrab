<script lang="ts">
  import { historyStore } from "$lib/stores/history.svelte";
  import HistoryItem from "$lib/components/HistoryItem.svelte";
  import { Trash2 } from "lucide-svelte";

  let items = $derived(historyStore.items);

  const TABS = [
    { id: "all", label: "All" },
    { id: "downloading", label: "Downloading" },
    { id: "queued", label: "Pending" },
    { id: "complete", label: "Completed" },
    { id: "error", label: "Failed" },
    { id: "cancelled", label: "Cancelled" },
  ] as const;

  type TabId = (typeof TABS)[number]["id"];
  let activeTab = $state<TabId>("all");

  let filteredItems = $derived(
    activeTab === "all" ? items : items.filter((i) => i.status === activeTab),
  );
</script>

<div class="h-full flex flex-col gap-8 animate-in fade-in duration-500">
  <header class="flex flex-wrap items-start justify-between gap-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-3xl md:text-5xl font-black italic tracking-tighter leading-none text-foreground">
        Download <span class="text-muted-foreground">History</span>
      </h1>
      <p class="text-muted-foreground font-medium text-sm md:text-base">
        Manage and access your previously downloaded media.
      </p>
    </div>

    {#if items.length > 0}
      <button
        onclick={() => historyStore.clearHistory()}
        class="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all font-bold text-sm active:scale-95 shrink-0"
      >
        <Trash2 class="h-4 w-4" />
        Clear All
      </button>
    {/if}
  </header>

  <div class="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
    {#each TABS as tab}
      <button
        onclick={() => (activeTab = tab.id)}
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap {activeTab === tab.id
          ? 'bg-indigo-600 text-white'
          : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'}"
      >
        {tab.label}
        <span
          class="ml-2 px-2 py-0.5 rounded-md text-xs {activeTab === tab.id
            ? 'bg-indigo-500/50 text-white'
            : 'bg-accent text-muted-foreground'}"
        >
          {tab.id === "all"
            ? items.length
            : items.filter((i) => i.status === tab.id).length}
        </span>
      </button>
    {/each}
  </div>

  <div class="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
    <div class="space-y-4">
      {#if filteredItems.length === 0}
        <div
          class="py-20 flex flex-col items-center justify-center text-muted-foreground"
        >
          <div
            class="h-24 w-24 bg-card rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl"
          >
            <Trash2 class="h-10 w-10" />
          </div>
          <h3 class="text-lg font-bold text-foreground">
            No history yet
          </h3>
          <p class="text-sm font-medium mt-2 text-muted-foreground">
            {activeTab === "all"
              ? "Start downloading to build your collection."
              : `No items found in ${TABS.find((t) => t.id === activeTab)?.label}.`}
          </p>
        </div>
      {:else}
        {#each filteredItems as item (item.id)}
          <HistoryItem {item} />
        {/each}
      {/if}
    </div>
  </div>
</div>