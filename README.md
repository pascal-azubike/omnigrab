# OmniGrab &bull; Universal Video Downloader

OmniGrab is a high-performance, cross-platform media extraction tool built with a single SvelteKit frontend and dual-target backends (Tauri for Desktop and BeeWare for Android).

## 🚀 Key Features

- **1800+ Sites Supported**: Powered by `yt-dlp` core.
- **Dual-Target Architecture**: Native-feeling apps for Windows, macOS, Linux, and Android.
- **Unified UI**: Shared Svelte 5 frontend with a premium dark theme.
- **Real-time Progress**: Live streaming of download status and speed.
- **Metadata Bliss**: Automatic embedding of thumbnails, subtitles, and tags.
- **Open Source**: Built with privacy and transparency in mind.

## 📁 Project Structure

```text
omnigrab/
├── packages/
│   ├── ui/        ← Shared SvelteKit frontend (Svelte 5 + Tailwind 4)
│   ├── desktop/   ← Tauri v2 (Rust) desktop backend
│   └── android/   ← BeeWare Briefcase (Python 3.12 + FastAPI) Android backend
├── landing/       ← Static landing page (Vercel)
└── .github/       ← CI/CD workflows for all targets
```

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: 20.x or higher
- **Rust**: 1.75+ (for Desktop)
- **Python**: 3.12 (for Android)
- **BeeWare Briefcase**: `pip install briefcase`

### Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Desktop (Dev)**:
   ```bash
   npm run dev:desktop
   ```

3. **Run Android (Dev)**:
   ```bash
   npm run dev:android
   ```

## 📦 Building Releases

### Desktop
Releases are automatically built and published via GitHub Actions when a new version tag (e.g., `v2.0.0`) is pushed.

### Android
1. Build the UI for Android:
   ```bash
   npm run build:ui:android
   ```
2. Build and package the APK:
   ```bash
   npm run build:android
   npm run package:android
   ```

## 🔐 CI/CD Secrets

To enable automated releases, ensure the following GitHub Secrets are configured:

- **Desktop**: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Android**: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
- **Landing Page**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
