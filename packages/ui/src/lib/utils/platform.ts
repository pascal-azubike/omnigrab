export type Platform = 'desktop' | 'android-webview' | 'browser'

export async function getPlatform(): Promise<Platform> {
  // @ts-ignore - Tauri defined at runtime
  if (window.__TAURI_INTERNALS__) return 'desktop'
  
  // Android WebView sets a custom user agent in our Toga app
  if (navigator.userAgent.includes('OmniGrabAndroid')) {
    return 'android-webview'
  }
  
  return 'browser'
}
