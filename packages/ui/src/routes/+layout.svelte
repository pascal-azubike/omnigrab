<script lang="ts">
  import "../app.css";
  import {
    Home,
    History,
    Settings,
    CloudDownload,
    Menu,
    X,
  } from "lucide-svelte";
  import { page } from "$app/state";
  import QueuePanel from "$lib/components/QueuePanel.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();

  let showQueue = $state(true);
  let mobileMenuOpen = $state(false);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/history", icon: History, label: "History" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  function isActive(href: string) {
    if (href === "/" && page.url.pathname !== "/") return false;
    return page.url.pathname.startsWith(href);
  }
</script>

<div
  class="h-screen w-full flex overflow-hidden bg-background text-foreground font-sans selection:bg-indigo-500/30"
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
  <main class="flex-grow flex flex-col min-w-0 relative">
    <!-- Top Header (Mobile Only) -->
    <header
      class="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <CloudDownload class="h-6 w-6 text-indigo-500" />
        <span class="font-black italic tracking-tighter text-xl uppercase"
          >OmniGrab</span
        >
      </div>
      <button
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        class="p-2 text-muted-foreground"
      >
        {#if mobileMenuOpen}
          <X />
        {:else}
          <Menu />
        {/if}
      </button>
    </header>

    <!-- Content Router -->
    <div
      class="flex-grow flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-12 lg:p-20"
    >
      <div class="max-w-6xl mx-auto w-full">
        {@render children()}
      </div>
    </div>

    <!-- Toggle Queue Button -->
    <button
      onclick={() => (showQueue = !showQueue)}
      class="absolute right-6 bottom-6 h-12 w-12 bg-card border border-border rounded-2xl flex items-center justify-center shadow-2xl hover:bg-accent transition-all z-40 md:flex hidden"
    >
      <CloudDownload
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

  <!-- Mobile Menu Overlay -->
  {#if mobileMenuOpen}
    <div
      class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 p-8 space-y-12 flex flex-col items-center justify-center animate-in fade-in duration-300"
    >
      <button
        onclick={() => (mobileMenuOpen = false)}
        class="absolute top-8 right-8 p-2 text-foreground"
      >
        <X class="h-8 w-8" />
      </button>
      <div class="flex flex-col items-center gap-8">
        {#each navItems as item}
          <a
            href={item.href}
            onclick={() => (mobileMenuOpen = false)}
            class="text-4xl font-black italic tracking-tighter uppercase transition-colors {isActive(
              item.href,
            )
              ? 'text-indigo-500'
              : 'text-muted-foreground'}"
          >
            {item.label}
          </a>
        {/each}
      </div>
      <ThemeToggle />
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