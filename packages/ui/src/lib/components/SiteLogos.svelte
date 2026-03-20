<script lang="ts">
  import { PLATFORMS } from '$lib/utils/platform.js';

  const logos = Object.values(PLATFORMS).filter(p => !!p.icon);
</script>

<div class="site-logos-container">
  <div class="site-logos-track">
    {#each [...logos, ...logos] as logo, i}
      <div class="logo-item" title={logo.name}>
        <img
          src="/platform-icons/{logo.icon}.svg"
          alt={logo.name}
          width="24"
          height="24"
          loading="lazy"
          onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <span class="logo-name">{logo.name}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .site-logos-container {
    width: 100%;
    overflow: hidden;
    position: relative;
    padding: 24px 0;
    mask-image: linear-gradient(
      to right,
      transparent,
      black 15%,
      black 85%,
      transparent
    );
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      black 15%,
      black 85%,
      transparent
    );
  }

  .site-logos-track {
    display: flex;
    gap: 32px;
    width: fit-content;
    animation: scroll 40s linear infinite;
  }

  .site-logos-track:hover {
    animation-play-state: paused;
  }

  .logo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    filter: grayscale(1) opacity(0.6);
    transition: all 0.3s;
    cursor: default;
    user-select: none;
  }

  .logo-item:hover {
    filter: grayscale(0) opacity(1);
    transform: scale(1.05);
  }

  .logo-name {
    font-size: 14px;
    font-weight: 500;
  }

  @keyframes scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(calc(-50% - 16px)); }
  }
</style>
