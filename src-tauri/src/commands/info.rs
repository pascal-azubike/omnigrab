use crate::{Format, PlaylistEntry, PlaylistInfo, VideoInfo};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

pub fn map_yt_dlp_error_pub(stderr: &str) -> String {
    map_yt_dlp_error(stderr)
}

fn map_yt_dlp_error(stderr: &str) -> String {
    if stderr.contains("Sign in to confirm") || stderr.contains("bot") {
        return "YouTube requires authentication. Go to Settings → Authentication and import your browser cookies.".to_string();
    }
    if stderr.contains("Private video") {
        return "This video is private. Import cookies from an account that has access in Settings.".to_string();
    }
    if stderr.contains("Video unavailable") || stderr.contains("has been removed") {
        return "This video is no longer available on this platform.".to_string();
    }
    if stderr.contains("not available in your country") {
        return "This content is geo-blocked in your region.".to_string();
    }
    if stderr.contains("Requested format is not available") {
        return "Selected quality not available. Try a lower quality.".to_string();
    }
    if stderr.contains("Playlist does not exist") {
        return "Playlist not found. It may be private or deleted.".to_string();
    }
    if stderr.contains("Unable to extract") {
        return "Could not extract video info. The URL may not be supported or the page structure may have changed. Try updating yt-dlp in Settings → About.".to_string();
    }
    if stderr.contains("ffmpeg") && stderr.contains("not found") {
        return "ffmpeg binary is missing. Please reinstall OmniGrab.".to_string();
    }
    if stderr.contains("network") || stderr.contains("Connection") || stderr.contains("timed out") {
        return "Connection failed. Check your internet connection.".to_string();
    }
    format!("Download error: {}", stderr.lines().last().unwrap_or(stderr))
}

#[tauri::command]
pub async fn get_video_info(app: AppHandle, url: String) -> Result<VideoInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["--dump-json", "--no-playlist", "--no-warnings", &url])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(map_yt_dlp_error(&stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|e| format!("JSON parse error: {}", e))?;

    let formats = json["formats"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|f| Format {
            format_id: f["format_id"].as_str().unwrap_or("").to_string(),
            ext: f["ext"].as_str().unwrap_or("").to_string(),
            height: f["height"].as_u64(),
            fps: f["fps"].as_f64(),
            filesize: f["filesize"].as_u64().or(f["filesize_approx"].as_u64()),
            vcodec: f["vcodec"].as_str().map(|s| s.to_string()),
            acodec: f["acodec"].as_str().map(|s| s.to_string()),
            format_note: f["format_note"].as_str().map(|s| s.to_string()),
        })
        .collect();

    let platform = extract_platform(&url);

    Ok(VideoInfo {
        id: json["id"].as_str().unwrap_or("").to_string(),
        title: json["title"].as_str().unwrap_or("Unknown").to_string(),
        thumbnail: json["thumbnail"].as_str().unwrap_or("").to_string(),
        duration: json["duration"].as_u64().unwrap_or(0),
        uploader: json["uploader"]
            .as_str()
            .or(json["channel"].as_str())
            .unwrap_or("Unknown")
            .to_string(),
        platform,
        webpage_url: json["webpage_url"]
            .as_str()
            .unwrap_or(&url)
            .to_string(),
        ext: json["ext"].as_str().unwrap_or("mp4").to_string(),
        formats,
        is_playlist: false,
    })
}

#[tauri::command]
pub async fn get_playlist_info(app: AppHandle, url: String) -> Result<PlaylistInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args([
            "--flat-playlist",
            "--dump-json",
            "--no-warnings",
            &url,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(map_yt_dlp_error(&stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let lines: Vec<&str> = stdout.lines().collect();

    if lines.is_empty() {
        return Err("No playlist data returned. The URL may not be a playlist.".to_string());
    }

    // First line is the playlist metadata, rest are entries
    let meta: serde_json::Value =
        serde_json::from_str(lines[0]).map_err(|e| format!("JSON parse error: {}", e))?;

    let entries: Vec<PlaylistEntry> = lines
        .iter()
        .enumerate()
        .filter_map(|(i, line)| {
            let entry: serde_json::Value = serde_json::from_str(line).ok()?;
            // Skip the top-level playlist object (has _type: "playlist")
            if entry["_type"].as_str() == Some("playlist") {
                return None;
            }
            Some(PlaylistEntry {
                index: (i as u64) + 1,
                title: entry["title"].as_str().unwrap_or("Unknown").to_string(),
                url: entry["url"]
                    .as_str()
                    .or(entry["webpage_url"].as_str())
                    .unwrap_or("")
                    .to_string(),
                thumbnail: entry["thumbnail"].as_str().unwrap_or("").to_string(),
                duration: entry["duration"].as_u64().unwrap_or(0),
            })
        })
        .collect();

    let total = entries.len() as u64;

    Ok(PlaylistInfo {
        playlist_title: meta["title"]
            .as_str()
            .or(meta["playlist_title"].as_str())
            .unwrap_or("Playlist")
            .to_string(),
        playlist_uploader: meta["uploader"]
            .as_str()
            .or(meta["channel"].as_str())
            .unwrap_or("Unknown")
            .to_string(),
        playlist_thumbnail: meta["thumbnail"].as_str().unwrap_or("").to_string(),
        total_count: if total > 0 {
            total
        } else {
            meta["playlist_count"].as_u64().unwrap_or(0)
        },
        entries,
    })
}

pub fn extract_platform(url: &str) -> String {
    let url_lower = url.to_lowercase();
    if url_lower.contains("youtube.com") || url_lower.contains("youtu.be") {
        "YouTube".to_string()
    } else if url_lower.contains("tiktok.com") {
        "TikTok".to_string()
    } else if url_lower.contains("instagram.com") {
        "Instagram".to_string()
    } else if url_lower.contains("twitter.com") || url_lower.contains("x.com") {
        "Twitter/X".to_string()
    } else if url_lower.contains("facebook.com") || url_lower.contains("fb.com") {
        "Facebook".to_string()
    } else if url_lower.contains("reddit.com") {
        "Reddit".to_string()
    } else if url_lower.contains("vimeo.com") {
        "Vimeo".to_string()
    } else if url_lower.contains("twitch.tv") {
        "Twitch".to_string()
    } else if url_lower.contains("soundcloud.com") {
        "SoundCloud".to_string()
    } else if url_lower.contains("bandcamp.com") {
        "Bandcamp".to_string()
    } else if url_lower.contains("dailymotion.com") {
        "Dailymotion".to_string()
    } else if url_lower.contains("bilibili.com") {
        "Bilibili".to_string()
    } else if url_lower.contains("rumble.com") {
        "Rumble".to_string()
    } else if url_lower.contains("odysee.com") {
        "Odysee".to_string()
    } else if url_lower.contains("pinterest.com") {
        "Pinterest".to_string()
    } else if url_lower.contains("nicovideo.jp") {
        "Niconico".to_string()
    } else if url_lower.contains("vk.com") {
        "VK".to_string()
    } else {
        "Unknown".to_string()
    }
}
