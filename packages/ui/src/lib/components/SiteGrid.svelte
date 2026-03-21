<script lang="ts">
  import {
    Youtube,
    Instagram,
    Twitter,
    Facebook,
    Twitch,
    Github,
    Music,
    PlayCircle,
    Radio,
  } from "lucide-svelte";

  const sites = [
    { name: "YouTube", icon: Youtube, color: "text-red-500" },
    { name: "TikTok", icon: Music, color: "text-white" },
    { name: "Instagram", icon: Instagram, color: "text-pink-500" },
    { name: "Twitter/X", icon: Twitter, color: "text-zinc-200" },
    { name: "Facebook", icon: Facebook, color: "text-blue-500" },
    { name: "Twitch", icon: Twitch, color: "text-purple-500" },
    { name: "SoundCloud", icon: PlayCircle, color: "text-orange-500" },
    { name: "Vimeo", icon: PlayCircle, color: "text-blue-400" },
    { name: "Reddit", icon: Radio, color: "text-orange-600" },
    { name: "Dailymotion", icon: PlayCircle, color: "text-blue-600" },
  ];
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
      Supported Platforms
    </h3>
    <span
      class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest"
      >1800+ more</span
    >
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
    {#each sites as site}
      <div
        class="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2 hover:border-zinc-700 hover:bg-zinc-800 transition-all cursor-default group"
      >
        <site.icon
          class="h-6 w-6 {site.color} transition-transform group-hover:scale-110"
        />
        <span
          class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest"
          >{site.name}</span
        >
      </div>
    {/each}
  </div>
</div>
