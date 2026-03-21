<script lang="ts">
  import SettingsForm from '$lib/components/SettingsForm.svelte';
</script>

<div class="h-full flex flex-col gap-8 animate-in fade-in duration-500">
  <header class="flex flex-col gap-2">
    <h1 class="text-3xl md:text-5xl font-black italic tracking-tighter leading-none text-foreground">
      App <span class="text-muted-foreground">Settings</span>
    </h1>
    <p class="text-muted-foreground font-medium text-sm md:text-base">Fine-tune OmniGrab to your preferences and needs.</p>
  </header>

  <div class="max-w-4xl">
    <SettingsForm />
  </div>
</div>