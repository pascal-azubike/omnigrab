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
  height?: number;
  fps?: number;
  filesize?: number;
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
