/**
 * Unified API layer for OmniGrab.
 * - When window.__TAURI__ is present → use Tauri invoke() commands
 * - When running in Android WebView → use fetch() to FastAPI on localhost:8765
 */

import { getPlatform } from './platform';

const ANDROID_API = 'http://127.0.0.1:8765';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: number;
  uploader?: string;
  platform?: string;
  is_playlist: boolean;
  formats: VideoFormat[];
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  height?: number;
  fps?: number;
  filesize?: number;
}

export interface PlaylistInfo {
  playlist_title: string;
  playlist_uploader?: string;
  total_count: number;
  entries: PlaylistEntry[];
}

export interface PlaylistEntry {
  index: number;
  title: string;
  url: string;
  thumbnail?: string;
  duration?: number;
}

export interface DownloadPayload {
  id: string;
  url: string;
  quality: string;
  format: string;
  embed_thumbnail?: boolean;
  embed_metadata?: boolean;
  download_subtitles?: boolean;
  subtitle_lang?: string;
  is_playlist?: boolean;
  playlist_items?: string;
}

export interface ProgressEvent {
  id: string;
  status: 'downloading' | 'processing' | 'complete' | 'error' | 'cancelled';
  percent?: string;
  speed?: string;
  eta?: string;
  downloaded?: number;
  total?: number;
  filename?: string;
  error?: string;
}

export interface VersionInfo {
  version: string;
  ok: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function isTauri(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'desktop';
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

// ──────────────────────────────────────────────────────────────────────────────
// API Functions
// ──────────────────────────────────────────────────────────────────────────────

/** Fetch video metadata from a URL */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  if (await isTauri()) {
    return tauriInvoke<VideoInfo>('get_video_info', { url });
  }
  const res = await fetch(`${ANDROID_API}/info?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get video info');
  }
  return res.json();
}

/** Fetch playlist metadata from a URL */
export async function getPlaylistInfo(url: string): Promise<PlaylistInfo> {
  if (await isTauri()) {
    return tauriInvoke<PlaylistInfo>('get_playlist_info', { url });
  }
  const res = await fetch(`${ANDROID_API}/playlist?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get playlist info');
  }
  return res.json();
}

/** Start a download. Returns the download ID. */
export async function startDownload(payload: DownloadPayload): Promise<string> {
  if (await isTauri()) {
    await tauriInvoke<void>('start_download', { payload });
    return payload.id;
  }
  const res = await fetch(`${ANDROID_API}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start download');
  }
  const data = await res.json();
  return data.download_id;
}

/** Cancel an active download */
export async function cancelDownload(id: string): Promise<void> {
  if (await isTauri()) {
    return tauriInvoke<void>('cancel_download', { id });
  }
  await fetch(`${ANDROID_API}/cancel/${id}`, { method: 'POST' });
}

/** Open the downloads folder */
export async function openFolder(path: string): Promise<void> {
  if (await isTauri()) {
    return tauriInvoke<void>('open_folder', { path });
  }
  // On Android WebView, not applicable — no-op
  console.log('open_folder not supported on Android WebView');
}

/** Get the default download directory path */
export async function getDefaultDownloadPath(): Promise<string> {
  if (await isTauri()) {
    return tauriInvoke<string>('get_default_download_path');
  }
  return '/storage/emulated/0/Download/OmniGrab';
}

/** Check yt-dlp version */
export async function checkYtDlpVersion(): Promise<VersionInfo> {
  if (await isTauri()) {
    return tauriInvoke<VersionInfo>('check_yt_dlp_version');
  }
  try {
    const res = await fetch(`${ANDROID_API}/health`);
    const data = await res.json();
    return { version: data.yt_dlp_version || 'unknown', ok: true };
  } catch {
    return { version: 'unknown', ok: false };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Progress Event Listener
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Listen for download progress events.
 * - On Desktop: uses Tauri event listener
 * - On Android: opens an SSE connection to the local FastAPI server
 *
 * Returns an unlisten/close function.
 */
export async function listenProgress(
  id: string,
  callback: (event: ProgressEvent) => void
): Promise<() => void> {
  if (await isTauri()) {
    const { listen } = await import('@tauri-apps/api/event');
    // Tauri emits a single 'download-progress' event for all downloads
    const unlisten = await listen<ProgressEvent>('download-progress', (e) => {
      if (e.payload.id === id) {
        callback(e.payload);
      }
    });
    return unlisten;
  }

  // Android: SSE from FastAPI
  const es = new EventSource(`${ANDROID_API}/progress/${id}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as ProgressEvent;
      callback(data);
      if (data.status === 'complete' || data.status === 'error' || data.status === 'cancelled') {
        es.close();
      }
    } catch {
      // ignore malformed events
    }
  };
  es.onerror = () => es.close();
  return () => es.close();
}
