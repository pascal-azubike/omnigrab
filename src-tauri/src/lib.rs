use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex; // #1: Use async-aware Mutex instead of std::sync::Mutex
use tauri_plugin_shell::process::CommandChild;

pub mod commands;

// #1: Async Mutex for non-blocking lock in async command handlers
pub type DownloadMap = Arc<Mutex<HashMap<String, CommandChild>>>;

// #2: Typed download status enum — no more stringly-typed status strings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Processing,
    Complete,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub thumbnail: String,
    pub duration: u64,
    pub uploader: String,
    pub platform: String,
    pub webpage_url: String,
    pub ext: String,
    pub formats: Vec<Format>,
    pub is_playlist: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Format {
    pub format_id: String,
    pub ext: String,
    pub height: Option<u64>,
    pub fps: Option<f64>,
    pub filesize: Option<u64>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub format_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistInfo {
    pub playlist_title: String,
    pub playlist_uploader: String,
    pub playlist_thumbnail: String,
    pub total_count: u64,
    pub entries: Vec<PlaylistEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistEntry {
    pub index: u64,
    pub title: String,
    pub url: String,
    pub thumbnail: String,
    pub duration: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadPayload {
    pub id: String,
    pub url: String,
    pub format: String,
    pub quality: String,
    pub output_path: String,
    pub embed_thumbnail: bool,
    pub embed_metadata: bool,
    pub download_subtitles: bool,
    pub subtitle_lang: String,
    pub is_playlist: bool,
    pub playlist_items: Option<String>,
    pub rate_limit: Option<String>,
    pub use_cookies: bool,
    pub cookies_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub id: String,
    pub percent: f64,
    pub speed: String,
    pub eta: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub current_title: String,
    pub status: DownloadStatus, // #2: typed enum instead of String
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistProgressEvent {
    pub id: String,
    pub current_index: u64,
    pub total_count: u64,
    pub current_title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    pub current: String,
    pub latest: String,
    pub needs_update: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let download_map: DownloadMap = Arc::new(Mutex::new(HashMap::new()));

    tauri::Builder::default()
        .manage(download_map)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_omnigrab_ytdl::init())
        // #3: updater removed — pubkey was empty, would fail silently at runtime
        // Re-enable when you have a real signing key: .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::info::get_video_info,
            commands::info::get_playlist_info,
            commands::download::start_download,
            commands::download::cancel_download,
            commands::system::open_folder,
            commands::system::get_default_download_path,
            commands::system::check_yt_dlp_version,
            commands::system::update_yt_dlp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OmniGrab");
}
