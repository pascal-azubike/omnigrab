use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<OmnigrabYtdl<R>> {
  Ok(OmnigrabYtdl(app.clone()))
}

/// Access to the omnigrab-ytdl APIs.
pub struct OmnigrabYtdl<R: Runtime>(AppHandle<R>);

impl<R: Runtime> OmnigrabYtdl<R> {
  pub fn get_video_info(&self, _payload: VideoInfoRequest) -> crate::Result<VideoInfoResponse> {
    Err(crate::Error::Io(std::io::Error::new(
      std::io::ErrorKind::Unsupported,
      "omnigrab-ytdl plugin is only supported on Android",
    )))
  }

  pub fn start_download(&self, _payload: DownloadRequest) -> crate::Result<DownloadResponse> {
    Err(crate::Error::Io(std::io::Error::new(
      std::io::ErrorKind::Unsupported,
      "omnigrab-ytdl plugin is only supported on Android",
    )))
  }
}
