/**
 * Unified API layer for OmniGrab.
 * - When window.__TAURI_INTERNALS__ is present → use Tauri invoke() commands
 * - When running in Android WebView → use fetch() to FastAPI on localhost:8765
 */

import { getPlatform } from './platform';
import type { VideoInfo, PlaylistInfo, DownloadPayload, ProgressEvent, VersionInfo } from '../types';

const ANDROID_API = 'http://127.0.0.1:8765';

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<VideoInfo>('get_video_info', { url });
  }
  const res = await fetch(`${ANDROID_API}/info?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Failed to get video info');
  return res.json();
}

export async function getPlaylistInfo(url: string): Promise<PlaylistInfo> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<PlaylistInfo>('get_playlist_info', { url });
  }
  const res = await fetch(`${ANDROID_API}/playlist?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('Failed to get playlist info');
  return res.json();
}

export async function startDownload(payload: DownloadPayload): Promise<string> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    await tauriInvoke<void>('start_download', { payload });
    return payload.id;
  }
  const res = await fetch(`${ANDROID_API}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.download_id;
}

export async function cancelDownload(id: string): Promise<void> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<void>('cancel_download', { id });
  }
  await fetch(`${ANDROID_API}/cancel/${id}`, { method: 'POST' });
}

export async function openFolder(path: string): Promise<void> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<void>('open_folder', { path });
  }
}

export async function getDefaultDownloadPath(): Promise<string> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<string>('get_default_download_path');
  }
  const res = await fetch(`${ANDROID_API}/config`);
  const data = await res.json();
  return data.download_path;
}

export async function checkYtDlpVersion(): Promise<VersionInfo> {
  const platform = await getPlatform();
  if (platform === 'desktop') {
    return tauriInvoke<VersionInfo>('check_yt_dlp_version');
  }
  const res = await fetch(`${ANDROID_API}/health`);
  const data = await res.json();
  return { version: data.yt_dlp_version, ok: true };
}

export async function listenProgress(id: string, callback: (event: ProgressEvent) => void): Promise<() => void> {
  const platform = await getPlatform();
  
  if (platform === 'desktop') {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<ProgressEvent>('download-progress', (e) => {
      if (e.payload.id === id) callback(e.payload);
    });
    return unlisten;
  }

  const es = new EventSource(`${ANDROID_API}/progress/${id}`);
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    callback(data);
    if (data.status === 'complete' || data.status === 'error') es.close();
  };
  return () => es.close();
}
