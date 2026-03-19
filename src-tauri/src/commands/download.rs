use crate::{DownloadPayload, PlaylistProgressEvent, ProgressEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

fn build_yt_dlp_args(payload: &DownloadPayload, ffmpeg_path: Option<String>) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    // ffmpeg location if provided
    if let Some(path) = ffmpeg_path {
        args.push("--ffmpeg-location".to_string());
        args.push(path);
    }

    // Format selector based on quality
    if payload.quality == "audio" {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push(payload.format.clone());
        args.push("--audio-quality".to_string());
        args.push("0".to_string());
    } else {
        let format_selector = match payload.quality.as_str() {
            "best" => "bestvideo+bestaudio/best".to_string(),
            "2160" => "bestvideo[height<=2160]+bestaudio/best".to_string(),
            "1080" => "bestvideo[height<=1080]+bestaudio/best".to_string(),
            "720" => "bestvideo[height<=720]+bestaudio/best".to_string(),
            "480" => "bestvideo[height<=480]+bestaudio/best".to_string(),
            "360" => "bestvideo[height<=360]+bestaudio/best".to_string(),
            _ => "bestvideo+bestaudio/best".to_string(),
        };
        args.push("-f".to_string());
        args.push(format_selector);

        // Remux to requested container format
        if payload.format == "mp4" {
            args.push("--remux-video".to_string());
            args.push("mp4".to_string());
            // More aggressive audio conversion for MP4
            args.push("--postprocessor-args".to_string());
            args.push("ffmpeg: -c:a aac -b:a 192k".to_string());
        } else if payload.format == "mkv" {
            args.push("--remux-video".to_string());
            args.push("mkv".to_string());
        }
    }

    // Output template
    args.push("-o".to_string());
    args.push(format!(
        "{}/%(title)s.%(ext)s",
        payload.output_path
    ));

    // Progress output
    args.push("--newline".to_string());
    args.push("--progress-template".to_string());
    args.push("PROG|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.speed)s|%(progress.eta)s|%(progress._percent_str)s|%(info.title)s".to_string());

    // Metadata embedding
    if payload.embed_thumbnail {
        args.push("--embed-thumbnail".to_string());
    }
    if payload.embed_metadata {
        args.push("--embed-metadata".to_string());
        args.push("--add-metadata".to_string());
    }

    // Subtitles
    if payload.download_subtitles {
        args.push("--write-sub".to_string());
        args.push("--write-auto-sub".to_string());
        args.push("--sub-lang".to_string());
        args.push(payload.subtitle_lang.clone());
    }

    // Cookies
    if payload.use_cookies {
        if let Some(ref cookies_path) = payload.cookies_path {
            args.push("--cookies".to_string());
            args.push(cookies_path.clone());
        }
    }

    // Rate limit
    if let Some(ref rate_limit) = payload.rate_limit {
        if !rate_limit.is_empty() {
            args.push("--rate-limit".to_string());
            args.push(rate_limit.clone());
        }
    }

    // Playlist items
    if payload.is_playlist {
        if let Some(ref playlist_items) = payload.playlist_items {
            if !playlist_items.is_empty() {
                args.push("--playlist-items".to_string());
                args.push(playlist_items.clone());
            }
        }
    } else {
        args.push("--no-playlist".to_string());
    }

    // Sleep interval to avoid rate limiting
    args.push("--sleep-interval".to_string());
    args.push("3".to_string());

    // No warnings in output
    args.push("--no-warnings".to_string());

    // URL at end
    args.push(payload.url.clone());

    args
}

fn parse_progress_line(line: &str) -> Option<(f64, u64, u64, String, String)> {
    if !line.starts_with("PROG|") {
        return None;
    }
    let parts: Vec<&str> = line.splitn(7, '|').collect();
    if parts.len() < 6 {
        return None;
    }
    let downloaded_bytes: u64 = parts[1].trim().parse().unwrap_or(0);
    let total_bytes: u64 = parts[2].trim().parse().unwrap_or(0);
    let speed = parts[3].trim().to_string();
    let eta = parts[4].trim().to_string();
    let percent_str = parts[5].trim();
    let percent: f64 = percent_str
        .trim_end_matches('%')
        .trim()
        .parse()
        .unwrap_or(0.0);
    Some((percent, downloaded_bytes, total_bytes, speed, eta))
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    payload: DownloadPayload,
) -> Result<String, String> {
    let download_id = payload.id.clone();
    
    // Attempt to find ffmpeg path to pass to yt-dlp
    let mut ffmpeg_path = None;
    
    // In Tauri 2, we can try to find the sidecar path
    #[cfg(desktop)]
    {
        use tauri::path::BaseDirectory;
        let triples = ["ffmpeg-x86_64-pc-windows-msvc.exe", "ffmpeg.exe", "ffmpeg"];
        
        for target in triples {
            if let Ok(path) = app.path().resolve(target, BaseDirectory::Resource) {
                if path.exists() {
                    ffmpeg_path = Some(path.to_string_lossy().to_string());
                    break;
                }
            }
        }

        // Fallback: check current exe dir
        if ffmpeg_path.is_none() {
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(parent) = exe_path.parent() {
                    let p = parent.join("ffmpeg.exe");
                    if p.exists() {
                        ffmpeg_path = Some(p.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    let args = build_yt_dlp_args(&payload, ffmpeg_path.clone());
    
    // DEBUG: print the command
    println!("Running yt-dlp with args: {:?}", args);
    println!("FFmpeg path detected: {:?}", ffmpeg_path);
    let is_playlist = payload.is_playlist;

    // Emit queued status
    let _ = app.emit(
        "download:progress",
        ProgressEvent {
            id: download_id.clone(),
            percent: 0.0,
            speed: "0 B/s".to_string(),
            eta: "--".to_string(),
            downloaded_bytes: 0,
            total_bytes: 0,
            current_title: String::new(),
            status: "downloading".to_string(),
        },
    );

    let (mut rx, child) = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(&args)
        .spawn()
        .map_err(|e| e.to_string())?;

    // Store child process
    {
        let state = app.state::<crate::DownloadMap>();
        let mut map = state.lock().map_err(|e| e.to_string())?;
        map.insert(download_id.clone(), child);
    }

    let app_clone = app.clone();
    let id_clone = download_id.clone();
    let mut playlist_index: u64 = 0;

    // Spawn async task to read progress
    tokio::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;

        let mut current_title = String::new();
        let mut had_error = false;
        let mut error_msg = String::new();

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line_str = String::from_utf8_lossy(&line).to_string();

                    // Detect playlist video change
                    if line_str.contains("[download] Downloading item") {
                        if let Some(idx_str) = line_str
                            .split("item ")
                            .nth(1)
                            .and_then(|s| s.split(" of ").next())
                        {
                            playlist_index = idx_str.trim().parse().unwrap_or(playlist_index + 1);
                        }
                    }

                    // Capture current video title
                    if line_str.starts_with("[download] Destination:") {
                        // Extract filename as title approximation
                        if let Some(name) = line_str.split("Destination: ").nth(1) {
                            current_title = name.trim().to_string();
                        }
                    }

                    if let Some((percent, dl_bytes, total_bytes, speed, eta)) =
                        parse_progress_line(&line_str)
                    {
                        let parts: Vec<&str> = line_str.splitn(7, '|').collect();
                        let title = if parts.len() >= 7 {
                            parts[6].trim().to_string()
                        } else {
                            current_title.clone()
                        };

                        let _ = app_clone.emit(
                            "download:progress",
                            ProgressEvent {
                                id: id_clone.clone(),
                                percent,
                                speed,
                                eta,
                                downloaded_bytes: dl_bytes,
                                total_bytes,
                                current_title: title.clone(),
                                status: "downloading".to_string(),
                            },
                        );

                        if is_playlist && playlist_index > 0 {
                            let _ = app_clone.emit(
                                "download:playlist-progress",
                                PlaylistProgressEvent {
                                    id: id_clone.clone(),
                                    current_index: playlist_index,
                                    total_count: 0, // Will be updated from frontend
                                    current_title: title,
                                },
                            );
                        }
                    }

                    // Processing / merging
                    if line_str.contains("[Merger]") || line_str.contains("[ffmpeg]") {
                        let _ = app_clone.emit(
                            "download:progress",
                            ProgressEvent {
                                id: id_clone.clone(),
                                percent: 100.0,
                                speed: String::new(),
                                eta: String::new(),
                                downloaded_bytes: 0,
                                total_bytes: 0,
                                current_title: current_title.clone(),
                                status: "processing".to_string(),
                            },
                        );
                    }
                }
                CommandEvent::Stderr(line) => {
                    let line_str = String::from_utf8_lossy(&line).to_string();
                    if !line_str.trim().is_empty() {
                        error_msg = line_str;
                    }
                }
                CommandEvent::Error(e) => {
                    had_error = true;
                    error_msg = e;
                    break;
                }
                CommandEvent::Terminated(status) => {
                    had_error = status.code != Some(0);
                    break;
                }
                _ => {}
            }
        }

        // Remove from active downloads
        if let Ok(mut map) = app_clone.state::<crate::DownloadMap>().lock() {
            map.remove(&id_clone);
        }

        // Emit final status
        if had_error {
            let user_error = crate::commands::info::map_yt_dlp_error_pub(&error_msg);
            let _ = app_clone.emit(
                "download:progress",
                ProgressEvent {
                    id: id_clone.clone(),
                    percent: 0.0,
                    speed: String::new(),
                    eta: String::new(),
                    downloaded_bytes: 0,
                    total_bytes: 0,
                    current_title: user_error,
                    status: "error".to_string(),
                },
            );
        } else {
            let _ = app_clone.emit(
                "download:progress",
                ProgressEvent {
                    id: id_clone.clone(),
                    percent: 100.0,
                    speed: String::new(),
                    eta: String::new(),
                    downloaded_bytes: 0,
                    total_bytes: 0,
                    current_title: String::new(),
                    status: "complete".to_string(),
                },
            );
        }
    });

    Ok(download_id)
}

#[tauri::command]
pub async fn cancel_download(
    app: AppHandle,
    download_id: String,
) -> Result<(), String> {
    let state = app.state::<crate::DownloadMap>();
    let mut map = state.lock().map_err(|e| e.to_string())?;
    if let Some(child) = map.remove(&download_id) {
        child.kill().map_err(|e| e.to_string())?;
    }
    let _ = app.emit("download:cancelled", serde_json::json!({ "id": download_id }));
    Ok(())
}
