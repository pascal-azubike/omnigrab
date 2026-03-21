<script lang="ts">
  import SettingsForm from '$lib/components/SettingsForm.svelte';
</script>

<div class="space-y-12 animate-in fade-in duration-500">
  <header class="space-y-2">
    <h1 class="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
      App <span class="text-zinc-700">Settings</span>
    </h1>
    <p class="text-zinc-500 font-medium">Fine-tune OmniGrab to your preferences and needs.</p>
  </header>

  <div class="max-w-4xl">
    <SettingsForm />
  </div>
</div>
