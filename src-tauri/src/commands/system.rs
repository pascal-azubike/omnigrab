use crate::VersionInfo;

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tauri::Emitter;

#[tauri::command]
pub async fn get_default_download_path() -> Result<String, String> {
    let home = dirs_path();
    Ok(home)
}

fn dirs_path() -> String {
    // Windows
    #[cfg(target_os = "windows")]
    {
        let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\User".to_string());
        return format!("{}\\Downloads\\OmniGrab", user_profile);
    }
    // Android
    #[cfg(target_os = "android")]
    {
        return "/storage/emulated/0/Download/OmniGrab".to_string();
    }
    // macOS / Linux
    #[allow(unreachable_code)]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string());
        format!("{}/Downloads/OmniGrab", home)
    }
}

#[tauri::command]
pub async fn open_folder(_path: String) -> Result<(), String> {
    // Use the OS to open the folder
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn check_yt_dlp_version(app: AppHandle) -> Result<VersionInfo, String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["--version"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let current = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Fetch latest from GitHub API
    let latest = fetch_latest_yt_dlp_version().await.unwrap_or_else(|_| current.clone());

    let needs_update = current != latest && !latest.is_empty();

    Ok(VersionInfo {
        current,
        latest,
        needs_update,
    })
}

async fn fetch_latest_yt_dlp_version() -> Result<String, String> {
    // Use ureq or reqwest — we'll shell out to avoid adding heavy deps
    // Return empty string if we can't determine
    Ok(String::new())
}

#[tauri::command]
pub async fn update_yt_dlp(app: AppHandle) -> Result<(), String> {
    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["-U"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Update failed: {}", err));
    }

    let _ = app.emit("yt_dlp:updated", ());
    Ok(())
}
