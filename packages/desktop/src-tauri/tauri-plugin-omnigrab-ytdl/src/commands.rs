use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::OmnigrabYtdlExt;

#[command]
pub(crate) async fn get_video_info<R: Runtime>(
    app: AppHandle<R>,
    payload: VideoInfoRequest,
) -> Result<VideoInfoResponse> {
    app.omnigrab_ytdl().get_video_info(payload)
}

#[command]
pub(crate) async fn start_download<R: Runtime>(
    app: AppHandle<R>,
    payload: DownloadRequest,
) -> Result<DownloadResponse> {
    app.omnigrab_ytdl().start_download(payload)
}
