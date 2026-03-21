<script lang="ts">
  import "../app.css";
  import {
    Home,
    History,
    Settings,
    CloudDownload,
    List,
  } from "lucide-svelte";
  import { page } from "$app/state";
  import QueuePanel from "$lib/components/QueuePanel.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();

  let showQueue = $state(true);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/queue", icon: List, label: "Queue" },
    { href: "/history", icon: History, label: "History" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  function isActive(href: string) {
    if (href === "/" && page.url.pathname !== "/") return false;
    return page.url.pathname.startsWith(href);
  }
</script>

<div
  class="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-background text-foreground font-sans selection:bg-indigo-500/30"
>
  <!-- Desktop Sidebar -->
  <aside
    class="hidden md:flex flex-col w-20 h-full border-r border-border bg-background/50 backdrop-blur-xl shrink-0"
  >
    <div class="p-6 flex items-center justify-center">
      <div
        class="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
      >
        <CloudDownload class="h-6 w-6 text-white" />
      </div>
    </div>

    <nav class="flex-grow flex flex-col items-center gap-4 pt-12">
      {#each navItems as item}
        <a
          href={item.href}
          class="p-4 rounded-2xl transition-all relative group {isActive(
            item.href,
          )
            ? 'bg-card text-indigo-400'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          <item.icon class="h-6 w-6" />
          {#if isActive(item.href)}
            <div
              class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            ></div>
          {/if}
          <div
            class="absolute left-full ml-4 px-3 py-1.5 bg-card text-foreground text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
          >
            {item.label}
          </div>
        </a>
      {/each}
    </nav>

    <div class="p-4 pb-8 flex flex-col items-center gap-4">
      <ThemeToggle />
    </div>
  </aside>

  <!-- Main Content Area -->
  <main class="flex-grow flex flex-col min-w-0 relative h-full">
    <!-- Top Header (Mobile Only) -->
    <header
      class="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-xl shrink-0"
    >
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <CloudDownload class="h-4 w-4 text-white" />
        </div>
        <span class="font-black italic tracking-tighter text-xl uppercase"
          >OmniGrab</span
        >
      </div>
      <ThemeToggle />
    </header>

    <!-- Content Router -->
    <div
      class="flex-grow flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-12 lg:p-20 pb-24 md:pb-12"
    >
      <div class="max-w-6xl mx-auto w-full">
        {@render children()}
      </div>
    </div>

    <!-- Bottom Navigation (Mobile Only) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-4 pb-safe z-50">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex flex-col items-center gap-1 transition-colors {isActive(item.href) ? 'text-indigo-400' : 'text-muted-foreground'}"
        >
          <item.icon class="h-5 w-5" />
          <span class="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          {#if isActive(item.href)}
            <div class="absolute bottom-1 h-1 w-4 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Toggle Queue Button (Desktop Only) -->
    <button
      onclick={() => (showQueue = !showQueue)}
      class="absolute right-6 bottom-6 h-12 w-12 bg-card border border-border rounded-2xl md:flex hidden items-center justify-center shadow-2xl hover:bg-accent transition-all z-40"
    >
      <List
        class="h-6 w-6 {showQueue ? 'text-indigo-400' : 'text-muted-foreground'}"
      />
    </button>
  </main>

  <!-- Right Queue Panel (Desktop Toggleable) -->
  {#if showQueue}
    <div class="w-[400px] border-l border-border hidden lg:block">
      <QueuePanel />
    </div>
  {/if}
</div>

<style>
  :global(.custom-scrollbar::-webkit-scrollbar) {
    width: 6px;
  }
  :global(.custom-scrollbar::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb) {
    background: rgb(var(--border));
    border-radius: 10px;
  }
  :global(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
    background: rgb(var(--muted-foreground));
  }
</style>