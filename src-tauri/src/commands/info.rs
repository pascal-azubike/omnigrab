use crate::{Format, PlaylistEntry, PlaylistInfo, VideoInfo};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

// #9: Made pub directly — removed the trivial `map_yt_dlp_error_pub` wrapper
pub fn map_yt_dlp_error(stderr: &str) -> String {
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

    // #11: Find the playlist metadata by _type field — not by assuming position 0
    let meta: serde_json::Value = lines
        .iter()
        .filter_map(|l| serde_json::from_str(l).ok())
        .find(|v: &serde_json::Value| v["_type"].as_str() == Some("playlist"))
        .unwrap_or_else(|| {
            serde_json::from_str(lines[0]).unwrap_or(serde_json::Value::Null)
        });

    // #11: Only include actual video entries (not the playlist object itself)
    let entries: Vec<PlaylistEntry> = lines
        .iter()
        .enumerate()
        .filter_map(|(i, line)| {
            let entry: serde_json::Value = serde_json::from_str(line).ok()?;
            if entry["_type"].as_str() == Some("playlist") {
                return None; // skip the top-level playlist object
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

// #10: Platform detection using a lookup table — eliminating the long if/else chain
pub fn extract_platform(url: &str) -> String {
    let url_lower = url.to_lowercase();

    // Ordered by frequency of use for slight performance benefit
    let platforms: &[(&str, &str)] = &[
        ("youtube.com",    "YouTube"),
        ("youtu.be",       "YouTube"),
        ("tiktok.com",     "TikTok"),
        ("instagram.com",  "Instagram"),
        ("twitter.com",    "Twitter/X"),
        ("x.com",          "Twitter/X"),
        ("facebook.com",   "Facebook"),
        ("fb.com",         "Facebook"),
        ("reddit.com",     "Reddit"),
        ("vimeo.com",      "Vimeo"),
        ("twitch.tv",      "Twitch"),
        ("soundcloud.com", "SoundCloud"),
        ("bandcamp.com",   "Bandcamp"),
        ("dailymotion.com","Dailymotion"),
        ("bilibili.com",   "Bilibili"),
        ("rumble.com",     "Rumble"),
        ("odysee.com",     "Odysee"),
        ("pinterest.com",  "Pinterest"),
        ("nicovideo.jp",   "Niconico"),
        ("vk.com",         "VK"),
    ];

    platforms
        .iter()
        .find(|(domain, _)| url_lower.contains(domain))
        .map(|(_, name)| name.to_string())
        .unwrap_or_else(|| "Unknown".to_string())
}
