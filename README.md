<div align="center">
  <img src="landing/favicon.png" alt="OmniGrab Logo" width="120" />
  <h1>OmniGrab</h1>
  <p><strong>Universal Video & Audio Downloader</strong></p>
  <p>Powered by yt-dlp, built with Tauri v2 + Svelte 5 + Tailwind v4</p>
</div>

---

## Features

- **1800+ Supported Sites**: Downloads from YouTube, TikTok, Instagram, X (Twitter), Reddit, Twitch, Vimeo, SoundCloud, and thousands more.
- **Universal Cross-Platform App**: Runs natively on Windows, macOS, Linux, and Android.
- **100% Local Processing**: No external servers, no cloud APIs. `yt-dlp` and `ffmpeg` are bundled as portable sidecar binaries.
- **Playlist Extraction**: Grid UI with checkboxes for downloading specific items from playlists or channels.
- **Metadata Embedding**: Options to embed thumbnails and write ID3/MP4 metadata tags.
- **Subtitle Support**: Auto-fetches requested subtitle languages (e.g., `en,es`).
- **Cookie Authentication**: Supports importing browser `cookies.txt` for downloading private/age-restricted content.

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Rust](https://rustup.rs/) (stable)
- OS-specific build tools (C++ build tools on Windows, Xcode on macOS, build-essential on Linux)

## 📁 Monorepo Setup

1. **Install Root Dependencies:** `npm install`
2. **Build Shared UI:**
   - `cd packages/ui`
   - `npm run build:desktop` (for Windows/Desktop)
   - `npm run build:android` (for Android)

## 🚀 Running the App

### Desktop (Tauri)
- `cd packages/desktop`
- `npm run tauri dev`

### Android (Briefcase)
- `cd packages/android`
- `.\.venv\Scripts\Activate.ps1`
- `python -m briefcase dev`

## 📦 Building for Production

### Desktop (Windows/Mac/Linux)
1. Build UI: `cd packages/ui && npm run build:desktop`
2. Build App: `cd ../desktop && npm run tauri build`
*Extract from: `packages/desktop/src-tauri/target/release/bundle/`*

### Android (APK/AAB)
1. Build UI: `cd packages/ui && npm run build:android`
2. Build App: `cd ../android && .\.venv\Scripts\Activate.ps1 && python -m briefcase package android`
*Extract from: `packages/android/dist/`*

## Application Architecture

- **Frontend**: SvelteKit static site (`@sveltejs/adapter-static`) with Svelte 5 runes for state management (`$state`, `$derived`).
- **Styling**: Tailwind CSS v4 utilizing CSS variables for dynamic Light/Dark default theming.
- **Backend**: Rust using Tauri v2. Handles all heavy lifting: managing child processes, streaming stdout to parse `yt-dlp` download progress, error mapping, and file operations.
- **Sidecars**: Heavy usage of `@tauri-apps/plugin-shell` for invoking `externalBin` commands (`yt-dlp` and `ffmpeg`).
- **State Persistence**: Uses `@tauri-apps/plugin-store` to save User History and App Settings.

## License

MIT License.

**Disclaimer**: This application is provided for educational and personal archival purposes. Follow the Terms of Service of the platforms you download from. Do not download or distribute copyrighted material without permission.
