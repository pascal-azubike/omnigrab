export type Platform = 'desktop' | 'android' | 'browser'

declare global {
    interface Window {
        AndroidBridge?: {
            openFolderPicker(): void
            getDefaultDownloadDir(): string
            isAndroid(): boolean
            openFileManager(path: string): void
            showToast(message: string): void
            getAppVersion(): string
        }
        onFolderSelected?: (path: string) => void
        __TAURI__?: unknown
    }
}

export function getPlatform(): Platform {
    if (window.AndroidBridge) return 'android'
    // @ts-ignore - Tauri defined at runtime
    if (window.__TAURI_INTERNALS__) return 'desktop'
    return 'browser'
}

export function isAndroid(): boolean {
    return getPlatform() === 'android'
}

export function isDesktop(): boolean {
    return getPlatform() === 'desktop'
}
