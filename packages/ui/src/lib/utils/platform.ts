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
