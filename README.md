# OmniGrab

**Download any video. From any platform. Free. Forever.**

[![Build Desktop](https://github.com/pascal-azubike/omnigrab/actions/workflows/desktop.yml/badge.svg)](https://github.com/pascal-azubike/omnigrab/actions/workflows/desktop.yml)
[![Build Android](https://github.com/pascal-azubike/omnigrab/actions/workflows/android.yml/badge.svg)](https://github.com/pascal-azubike/omnigrab/actions/workflows/android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Supported Platforms (1800+ sites)

YouTube, TikTok, Instagram, Twitter/X, Facebook, Reddit, Vimeo, Twitch, SoundCloud, Bilibili, Bandcamp, Dailymotion, Rumble, Odysee, Pinterest, VK and [hundreds more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

---

## Downloads

| Platform | Download |
|---|---|
| Windows | `OmniGrab-x.x.x-setup.exe` |
| macOS | `OmniGrab-x.x.x.dmg` |
| Linux | `OmniGrab-x.x.x.AppImage` |
| Android | `OmniGrab-x.x.x-android.apk` |

→ **[Latest Release](https://github.com/pascal-azubike/omnigrab/releases/latest)**

---

## Architecture

### Desktop (Windows / macOS / Linux)
- **Framework:** [Tauri v2](https://tauri.app/) + Rust backend
- **UI:** SvelteKit (compiled to static HTML/JS, loaded by Tauri WebView)
- **Downloader:** yt-dlp bundled as a sidecar binary (no Python required)
- **Merging:** ffmpeg bundled as a sidecar binary

### Android
- **Framework:** [BeeWare Briefcase](https://briefcase.readthedocs.io/) + Toga WebView
- **UI:** Same SvelteKit frontend, served by a local FastAPI server
- **Downloader:** yt-dlp Python package (runs natively inside the APK via Chaquopy)
- **API:** FastAPI on `localhost:8765` — WebView calls it via `fetch()`

```
Desktop:  SvelteKit UI → Tauri invoke() → Rust → yt-dlp sidecar binary
Android:  SvelteKit UI → fetch(localhost:8765) → FastAPI → yt-dlp Python
```

---

## Prerequisites

### Desktop Development
- [Node.js 20+](https://nodejs.org/)
- [Rust stable](https://rustup.rs/)
- **Linux only:** `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev`
- **macOS only:** Xcode Command Line Tools (`xcode-select --install`)

### Android Development
- [Python 3.12](https://www.python.org/downloads/)
- `pip install briefcase`
- Java JDK 17 (auto-installed by `briefcase upgrade java` if needed)
- [Android Studio](https://developer.android.com/studio) + Android SDK
- Set `ANDROID_HOME` environment variable to your SDK path
- [Node.js 20+](https://nodejs.org/)

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/pascal-azubike/omnigrab
cd omnigrab
cd packages/ui && npm install
```

### 2. Run Desktop (dev mode)

```bash
# Terminal 1: start Vite dev server
cd packages/ui && npm run dev

# Terminal 2: start Tauri in dev mode
cd packages/desktop && npx tauri dev
```

The Tauri config automatically runs both via `beforeDevCommand`. You can also just:

```bash
cd packages/desktop && npm run dev
```

### 3. Run Android

```bash
# Step 1: build the SvelteKit UI for Android
cd packages/ui && npm run build:android

# Step 2: create the Briefcase Android scaffold (first time only)
cd packages/android
briefcase create android

# Step 3: run on emulator
briefcase run android

# Step 4: run on physical device
briefcase run android --device <device-udid>

# Step 5: list connected devices
briefcase run android --list-devices
```

#### Iterating quickly on Android

```bash
# After changing Python code:
cd packages/android
briefcase update android && briefcase run android

# After changing SvelteKit UI:
cd packages/ui && npm run build:android
cd packages/android && briefcase update android && briefcase run android
```

#### Test the FastAPI server on desktop (without a device)

```bash
cd packages/android
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

# Start the server
python -c "from omnigrab_android.server import start_server; start_server()"

# In a new terminal, test it:
curl http://localhost:8765/health
# → {"status": "ok", "yt_dlp_version": "..."}
```

---

## Building for Release

### Desktop — all platforms via GitHub Actions

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds Windows, macOS, and Linux simultaneously and attaches the installers to the GitHub Release automatically.

### Android APK via GitHub Actions

```bash
git tag v1.0.0
git push origin v1.0.0
```

The Android workflow builds the APK, signs it (if secrets are configured), and uploads it to the GitHub Release.

**If signing secrets are not set:** A debug APK (unsigned, for testing) is uploaded instead with a warning in the release notes.

### Android APK manually (local)

```bash
# 1. Build the UI
cd packages/ui && npm run build:android

# 2. Create scaffold & build debug APK
cd packages/android
briefcase create android --no-input
briefcase build android --no-input

# 3. Build signed release AAB
briefcase package android --no-input

# 4. Convert AAB → signed universal APK
export VERSION=1.0.0
export ANDROID_KEYSTORE_PATH=/path/to/omnigrab-release.jks
export ANDROID_KEYSTORE_PASSWORD=yourpassword
export ANDROID_KEY_ALIAS=omnigrab
export ANDROID_KEY_PASSWORD=yourpassword
bash scripts/aab-to-apk.sh
# → dist/OmniGrab-1.0.0-android.apk
```

---

## Setting up GitHub Actions Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions** and add:

### Desktop signing (Tauri updater)

| Secret | How to get |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Run `npx tauri signer generate`, copy the private key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password you chose during key generation |

### Android signing

| Secret | How to get |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Run `scripts/create-keystore.sh` → base64-encode the `.jks` file |
| `ANDROID_KEYSTORE_PASSWORD` | Password you chose during keystore creation |
| `ANDROID_KEY_ALIAS` | Alias you chose (default: `omnigrab`) |
| `ANDROID_KEY_PASSWORD` | Key password (often same as keystore password) |

**Generating the keystore (one time only):**

```bash
bash scripts/create-keystore.sh
# Creates omnigrab-release.jks
# Base64-encodes it to omnigrab-release.jks.b64
# Paste the contents of the .b64 file into the ANDROID_KEYSTORE_BASE64 secret
```

> ⚠️ **Never commit `.jks` files to git.** They are in `.gitignore`.

### Landing page (optional)

| Secret | How to get |
|---|---|
| `VERCEL_TOKEN` | From [vercel.com](https://vercel.com) → Account Settings → Tokens |
| `VERCEL_ORG_ID` | From `vercel.com` → Settings → General |
| `VERCEL_PROJECT_ID` | From your Vercel project settings |

---

## Authentication (for private or age-restricted content)

Some platforms (especially YouTube) require a login to download certain videos.

### Export browser cookies

1. Install the [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) Chrome extension
2. Go to [youtube.com](https://youtube.com) and sign in
3. Click the extension → Export → save as `cookies.txt`
4. In OmniGrab: **Settings → Authentication** → import the file

### YouTube PO Token

For heavily rate-limited requests, you may also need a PO (Proof of Origin) token:

1. Open YouTube in a browser (logged in)
2. Open DevTools → Network tab → filter for `player?` requests
3. In the request payload, find `poToken`
4. Paste it into **Settings → Authentication → PO Token** in OmniGrab

---

## YouTube Notes

- YouTube now requires authentication for some content types
- Import cookies from a logged-in browser session for best results
- `"No supported JavaScript runtime"` warnings are expected on Android if the QuickJS binary is absent — basic downloads still work
- If you see `"Sign in to confirm"` errors: import your browser cookies

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Video unavailable` | Video was removed or is region-blocked |
| `Private video` | Import cookies from an account with access |
| `Sign in to confirm` | Import your browser cookies in Settings → Authentication |
| `Requested format is not available` | Select a lower quality (e.g. 1080p → 720p) |
| `No supported JavaScript runtime` | Expected on Android — limited YouTube formats but basic downloads work |
| Downloads don't appear on Android | Check the download path in Settings. Default: `Download/OmniGrab/` on internal storage |
| Android app shows blank screen | The FastAPI server may not have started — force-close and reopen the app |
| `Desktop build fails on Linux` | Ensure `libwebkit2gtk-4.1-dev` is installed (not `4.0`) |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).

Built on [yt-dlp](https://github.com/yt-dlp/yt-dlp), [Tauri](https://tauri.app/), [SvelteKit](https://kit.svelte.dev/), and [BeeWare](https://beeware.org/).
