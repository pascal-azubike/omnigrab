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

## Setup & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Download Sidecar Binaries (CRITICAL):**
   Before running or building, you **must** download the `yt-dlp` and `ffmpeg` executables for your platform. A script is provided to automate this:
   ```bash
   node scripts/download-binaries.js
   ```

3. **Run in Development Mode:**
   ```bash
   npm run tauri dev
   ```

## Building for Production

To compile an optimized release build for your current platform:

```bash
npm run tauri build
```

The resulting installers (e.g., `.msi` for Windows, `.dmg` for macOS, `.AppImage` for Linux) will be located in `src-tauri/target/release/bundle/`.

## Application Architecture

- **Frontend**: SvelteKit static site (`@sveltejs/adapter-static`) with Svelte 5 runes for state management (`$state`, `$derived`).
- **Styling**: Tailwind CSS v4 utilizing CSS variables for dynamic Light/Dark default theming.
- **Backend**: Rust using Tauri v2. Handles all heavy lifting: managing child processes, streaming stdout to parse `yt-dlp` download progress, error mapping, and file operations.
- **Sidecars**: Heavy usage of `@tauri-apps/plugin-shell` for invoking `externalBin` commands (`yt-dlp` and `ffmpeg`).
- **State Persistence**: Uses `@tauri-apps/plugin-store` to save User History and App Settings.

## License

MIT License.

**Disclaimer**: This application is provided for educational and personal archival purposes. Follow the Terms of Service of the platforms you download from. Do not download or distribute copyrighted material without permission.
