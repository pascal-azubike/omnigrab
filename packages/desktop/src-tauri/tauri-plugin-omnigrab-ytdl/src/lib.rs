use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
pub mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::OmnigrabYtdl;
#[cfg(mobile)]
use mobile::OmnigrabYtdl;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the omnigrab-ytdl APIs.
pub trait OmnigrabYtdlExt<R: Runtime> {
  fn omnigrab_ytdl(&self) -> &OmnigrabYtdl<R>;
}

impl<R: Runtime, T: Manager<R>> crate::OmnigrabYtdlExt<R> for T {
  fn omnigrab_ytdl(&self) -> &OmnigrabYtdl<R> {
    self.state::<OmnigrabYtdl<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("omnigrab-ytdl")
    .invoke_handler(tauri::generate_handler![
      commands::get_video_info,
      commands::start_download
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let omnigrab_ytdl = mobile::init(app, api)?;
      #[cfg(desktop)]
      let omnigrab_ytdl = desktop::init(app, api)?;
      app.manage(omnigrab_ytdl);
      Ok(())
    })
    .build()
}
