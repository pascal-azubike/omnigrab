/**
 * Platform detection for OmniGrab.
 * Determines whether the UI is running inside Tauri (desktop),
 * Android WebView, or a regular browser.
 */

export type Platform = 'desktop' | 'android-webview' | 'browser';

let _platform: Platform | null = null;

export async function getPlatform(): Promise<Platform> {
  if (_platform) return _platform;

  // Tauri injects __TAURI_INTERNALS__ on desktop
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    _platform = 'desktop';
    return _platform;
  }

  // Android WebView sets a custom user agent containing 'OmniGrabAndroid'
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('OmniGrabAndroid')) {
    _platform = 'android-webview';
    return _platform;
  }

  _platform = 'browser';
  return _platform;
}

/** Returns true if running inside Tauri desktop wrapper */
export async function isDesktop(): Promise<boolean> {
  return (await getPlatform()) === 'desktop';
}

/** Returns true if running inside the Android WebView */
export async function isAndroid(): Promise<boolean> {
  return (await getPlatform()) === 'android-webview';
}

/** Returns true if running as a pure web browser (no native shell) */
export async function isBrowser(): Promise<boolean> {
  return (await getPlatform()) === 'browser';
}

// ──────────────────────────────────────────────────────────────────────────────
// Website Platform Detection
// ──────────────────────────────────────────────────────────────────────────────

export interface PlatformSite {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const PLATFORMS: Record<string, PlatformSite> = {
  youtube: { id: 'youtube', name: 'YouTube', icon: 'youtube', color: '#FF0000' },
  tiktok: { id: 'tiktok', name: 'TikTok', icon: 'tiktok', color: '#000000' },
  instagram: { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E1306C' },
  twitter: { id: 'twitter', name: 'Twitter', icon: 'twitter', color: '#1DA1F2' },
  vimeo: { id: 'vimeo', name: 'Vimeo', icon: 'vimeo', color: '#1AB7EA' },
  twitch: { id: 'twitch', name: 'Twitch', icon: 'twitch', color: '#9146FF' },
  soundcloud: { id: 'soundcloud', name: 'SoundCloud', icon: 'soundcloud', color: '#FF3300' },
  facebook: { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2' },
};

export function detectPlatform(url: string): PlatformSite | null {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    if (host.includes('youtube') || host.includes('youtu.be')) return PLATFORMS.youtube;
    if (host.includes('tiktok')) return PLATFORMS.tiktok;
    if (host.includes('instagram')) return PLATFORMS.instagram;
    if (host.includes('twitter') || host.includes('x.com')) return PLATFORMS.twitter;
    if (host.includes('vimeo')) return PLATFORMS.vimeo;
    if (host.includes('twitch')) return PLATFORMS.twitch;
    if (host.includes('soundcloud')) return PLATFORMS.soundcloud;
    if (host.includes('facebook')) return PLATFORMS.facebook;
    return null;
  } catch {
    return null;
  }
}

export function isPlaylistUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube') && (u.searchParams.has('list') || u.pathname.includes('/playlist'))) return true;
    return false;
  } catch {
    return false;
  }
}
