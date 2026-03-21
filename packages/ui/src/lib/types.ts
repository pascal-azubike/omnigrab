export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  platform: string;
  webpage_url: string;
  ext: string;
  formats: Format[];
  is_playlist: boolean;
}

export interface Format {
  format_id: string;
  ext: string;
  height: number | null;
  fps: number | null;
  filesize: number | null;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
}

export interface PlaylistInfo {
  playlist_title: string;
  playlist_uploader: string;
  playlist_thumbnail: string;
  total_count: number;
  entries: PlaylistEntry[];
}

export interface PlaylistEntry {
  index: number;
  title: string;
  url: string;
  thumbnail: string;
  duration: number;
}

export interface DownloadPayload {
  id: string;
  url: string;
  quality: string;
  format: string;
  embed_thumbnail: boolean;
  embed_metadata: boolean;
  download_subtitles: boolean;
  subtitle_lang: string;
  is_playlist: boolean;
  playlist_items?: string;
  output_path?: string;
  use_cookies?: boolean;
  cookies_path?: string;
}

export interface ProgressEvent {
  id: string;
  status: 'downloading' | 'processing' | 'complete' | 'error' | 'cancelled';
  percent: number;
  speed: string;
  eta: string;
  downloaded_bytes: number;
  total_bytes: number;
  current_title: string;
  error?: string;
}

export interface VersionInfo {
  version: string;
  ok: boolean;
}
