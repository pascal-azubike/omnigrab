use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_omnigrab_ytdl);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<OmnigrabYtdl<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.omnigrab_ytdl", "OmnigrabYtdlPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_omnigrab_ytdl)?;
  Ok(OmnigrabYtdl(handle))
}

/// Access to the omnigrab-ytdl APIs.
pub struct OmnigrabYtdl<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> OmnigrabYtdl<R> {
  pub fn get_video_info(&self, payload: VideoInfoRequest) -> crate::Result<VideoInfoResponse> {
    self
      .0
      .run_mobile_plugin("getVideoInfo", payload)
      .map_err(Into::into)
  }

  pub fn start_download(&self, payload: DownloadRequest) -> crate::Result<DownloadResponse> {
    self
      .0
      .run_mobile_plugin("startDownload", payload)
      .map_err(Into::into)
  }
}
