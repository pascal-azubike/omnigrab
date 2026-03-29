import os
import asyncio
import threading
import json
import uuid
import stat
import shutil
from pathlib import Path
from typing import AsyncGenerator, Optional

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="OmniGrab Android API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active download progress queues
progress_queues: dict[str, asyncio.Queue] = {}

# ─── Platform Detection ───────────────────────────────────────

def is_android() -> bool:
    """Detect if running on Android via Chaquopy."""
    return os.path.exists("/system/build.prop") or \
           "ANDROID_DATA" in os.environ or \
           hasattr(__builtins__, '__chaquopy__')

# ─── Storage ─────────────────────────────────────────────────

def get_download_dir(custom_path: str = None) -> Path:
    """
    Get download directory.
    On Android: use public Downloads/OmniGrab by default.
    Supports custom path from user settings.
    """
    if custom_path and Path(custom_path).exists():
        path = Path(custom_path)
    elif is_android():
        path = Path("/storage/emulated/0/Download/OmniGrab")
    else:
        path = Path.home() / "Downloads" / "OmniGrab"

    path.mkdir(parents=True, exist_ok=True)
    return path

# ─── ffmpeg Detection ─────────────────────────────────────────

def get_ffmpeg_location() -> Optional[str]:
    """
    Find ffmpeg binary.
    On desktop: ffmpeg is in PATH (bundled with Tauri sidecar).
    On Android: look for static binary in app files dir.
    """
    if not is_android():
        # Desktop has ffmpeg via Tauri sidecar in PATH
        return None  # yt-dlp finds it automatically

    # Android: look for bundled static ffmpeg binary
    possible_paths = [
        Path(os.environ.get("ANDROID_DATA", "")) /
            "data/com.omnigrab.android/files/ffmpeg",
        Path("/data/data/com.omnigrab.android/files/ffmpeg"),
    ]

    for p in possible_paths:
        if p.exists():
            # Ensure it's executable
            p.chmod(p.stat().st_mode |
                    stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
            return str(p.parent)

    return None  # No ffmpeg — use pre-merged formats only

def get_format_selector(quality: str, fmt: str) -> str:
    """
    Build yt-dlp format selector.
    Without ffmpeg (Android, no binary): pre-merged formats only.
    With ffmpeg (desktop or Android with binary): full quality.
    """
    has_ffmpeg = get_ffmpeg_location() is not None or not is_android()

    if has_ffmpeg:
        quality_map = {
            "best":  "bestvideo+bestaudio/best",
            "2160":  "bestvideo[height<=2160]+bestaudio/best",
            "1080":  "bestvideo[height<=1080]+bestaudio/best",
            "720":   "bestvideo[height<=720]+bestaudio/best",
            "480":   "bestvideo[height<=480]+bestaudio/best",
            "360":   "bestvideo[height<=360]+bestaudio/best",
            "audio": "bestaudio/best",
        }
    else:
        # Pre-merged only — no ffmpeg needed
        quality_map = {
            "best":  "best[ext=mp4]/bestvideo*+bestaudio/best",
            "1080":  "best[height<=1080][ext=mp4]/best[height<=1080]",
            "720":   "best[height<=720][ext=mp4]/best[height<=720]",
            "480":   "best[height<=480][ext=mp4]/best[height<=480]",
            "360":   "best[height<=360][ext=mp4]/best[height<=360]",
            "audio": "bestaudio/best",
        }

    return quality_map.get(quality, "best[ext=mp4]/best")

# ─── API Endpoints ────────────────────────────────────────────

@app.get("/health")
async def health():
    import yt_dlp
    return {
        "status": "ok",
        "platform": "android" if is_android() else "desktop",
        "yt_dlp_version": yt_dlp.version.__version__,
        "ffmpeg_available": get_ffmpeg_location() is not None
    }

@app.get("/api/info")
async def get_info(url: str):
    import yt_dlp
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "noplaylist": True,
        "simulate": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "duration": info.get("duration"),
                "uploader": info.get("uploader"),
                "platform": info.get("extractor_key"),
                "is_playlist": False,
                "formats": [
                    {
                        "format_id": f.get("format_id"),
                        "ext": f.get("ext"),
                        "height": f.get("height"),
                        "filesize": f.get("filesize"),
                    }
                    for f in info.get("formats", [])
                    if f.get("height")
                ],
            }
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": _friendly_error(str(e))}
        )

@app.get("/api/playlist")
async def get_playlist(url: str):
    import yt_dlp
    opts = {
        "quiet": True,
        "extract_flat": True,
        "noplaylist": False,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info.get("_type") != "playlist":
                return JSONResponse(
                    status_code=400,
                    content={"error": "Not a playlist URL"}
                )
            return {
                "playlist_title": info.get("title"),
                "playlist_uploader": info.get("uploader"),
                "total_count": len(info.get("entries", [])),
                "entries": [
                    {
                        "index": i + 1,
                        "title": e.get("title"),
                        "url": e.get("url") or
                               e.get("webpage_url"),
                        "thumbnail": e.get("thumbnail"),
                        "duration": e.get("duration"),
                    }
                    for i, e in enumerate(
                        info.get("entries", [])
                    )
                ],
            }
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": _friendly_error(str(e))}
        )

@app.post("/api/download")
async def start_download(payload: dict):
    download_id = payload.get("id") or str(uuid.uuid4())
    url = payload["url"]
    quality = payload.get("quality", "best")
    fmt = payload.get("format", "mp4")
    embed_thumbnail = payload.get("embed_thumbnail", True)
    embed_metadata = payload.get("embed_metadata", True)
    is_playlist = payload.get("is_playlist", False)
    playlist_items = payload.get("playlist_items")
    cookies_path = payload.get("cookies_path")
    custom_path = payload.get("output_path")

    output_dir = get_download_dir(custom_path)
    ffmpeg_loc = get_ffmpeg_location()

    q: asyncio.Queue = asyncio.Queue()
    progress_queues[download_id] = q

    opts = {
        "format": get_format_selector(quality, fmt),
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "noplaylist": not is_playlist,
        "embedthumbnail": embed_thumbnail,
        "addmetadata": embed_metadata,
        "sleep_interval": 3,
        "quiet": False,
        "progress_hooks": [_make_progress_hook(download_id)],
        "postprocessor_hooks": [_make_pp_hook(download_id)],
    }

    if ffmpeg_loc:
        opts["ffmpeg_location"] = ffmpeg_loc

    if fmt == "mp3":
        opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }]
    elif fmt in ("m4a", "flac"):
        opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": fmt,
            "preferredquality": "0",
        }]
    else:
        if ffmpeg_loc:
            opts["merge_output_format"] = "mp4"

    if playlist_items:
        opts["playlist_items"] = playlist_items

    if cookies_path and Path(cookies_path).exists():
        opts["cookiefile"] = cookies_path

    loop = asyncio.get_event_loop()
    loop.run_in_executor(
        None, _run_download, opts, url, download_id
    )

    return {"download_id": download_id, "status": "started"}

@app.post("/api/cancel/{download_id}")
async def cancel_download(download_id: str):
    q = progress_queues.get(download_id)
    if q:
        await q.put({"id": download_id, "status": "cancelled"})
        progress_queues.pop(download_id, None)
    return {"status": "cancelled"}

@app.get("/api/progress/{download_id}")
async def progress_stream(download_id: str):
    async def event_generator() -> AsyncGenerator[str, None]:
        q = progress_queues.get(download_id)
        if not q:
            yield f"data: {json.dumps({'error': 'Not found'})}\n\n"
            return
        while True:
            try:
                event = await asyncio.wait_for(
                    q.get(), timeout=30.0
                )
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") in (
                    "complete", "error", "cancelled"
                ):
                    progress_queues.pop(download_id, None)
                    break
            except asyncio.TimeoutError:
                yield ": ping\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/api/history")
async def get_history(custom_path: str = None):
    dl_dir = get_download_dir(custom_path)
    files = []
    for f in sorted(
        dl_dir.iterdir(),
        key=lambda x: x.stat().st_mtime,
        reverse=True
    ):
        if f.is_file() and not f.name.startswith("."):
            stat_info = f.stat()
            files.append({
                "filename": f.name,
                "path": str(f),
                "size": stat_info.st_size,
                "modified": stat_info.st_mtime,
            })
    return {"files": files[:100]}

@app.get("/api/settings")
async def get_settings():
    settings_path = _get_settings_path()
    if settings_path.exists():
        return json.loads(settings_path.read_text())
    return {}

@app.post("/api/settings")
async def save_settings(settings: dict):
    settings_path = _get_settings_path()
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(settings, indent=2))
    return {"status": "saved"}

def _get_settings_path() -> Path:
    if is_android():
        return Path(
            "/data/data/com.omnigrab.android/files/settings.json"
        )
    return Path.home() / ".omnigrab" / "settings.json"

# ─── Progress Hooks ───────────────────────────────────────────

def _make_progress_hook(download_id: str):
    def hook(d):
        try:
            loop = asyncio.get_event_loop()
            if d["status"] == "downloading":
                event = {
                    "id": download_id,
                    "status": "downloading",
                    "percent": d.get(
                        "_percent_str", "0%"
                    ).strip(),
                    "speed": d.get(
                        "_speed_str", "N/A"
                    ).strip(),
                    "eta": d.get("_eta_str", "N/A").strip(),
                    "downloaded": d.get("downloaded_bytes", 0),
                    "total": d.get("total_bytes") or d.get(
                        "total_bytes_estimate", 0
                    ),
                }
            elif d["status"] == "finished":
                event = {
                    "id": download_id,
                    "status": "processing",
                    "percent": "100%",
                }
            else:
                return
            loop.call_soon_threadsafe(
                progress_queues[download_id].put_nowait, event
            )
        except Exception:
            pass
    return hook

def _make_pp_hook(download_id: str):
    def hook(d):
        try:
            if d["status"] == "finished":
                loop = asyncio.get_event_loop()
                event = {
                    "id": download_id,
                    "status": "complete",
                    "percent": "100%",
                    "filename": d.get(
                        "info_dict", {}
                    ).get("filepath", ""),
                }
                loop.call_soon_threadsafe(
                    progress_queues[download_id].put_nowait,
                    event
                )
        except Exception:
            pass
    return hook

def _run_download(opts: dict, url: str, download_id: str):
    import yt_dlp
    import asyncio
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as e:
        try:
            loop = asyncio.get_event_loop()
            loop.call_soon_threadsafe(
                progress_queues[download_id].put_nowait,
                {
                    "id": download_id,
                    "status": "error",
                    "error": _friendly_error(str(e)),
                }
            )
        except Exception:
            pass

def _friendly_error(raw: str) -> str:
    errors = {
        "Sign in to confirm": (
            "YouTube requires authentication. "
            "Import cookies in Settings → Authentication."
        ),
        "Private video": (
            "This video is private."
        ),
        "Video unavailable": (
            "This video is no longer available."
        ),
        "not available in your country": (
            "This content is geo-blocked in your region."
        ),
        "Requested format is not available": (
            "Selected quality not available. Try lower quality."
        ),
        "No supported JavaScript runtime": (
            "Limited YouTube format support without JS runtime."
        ),
    }
    for key, msg in errors.items():
        if key.lower() in raw.lower():
            return msg
    return f"Download failed: {raw[:200]}"

# ─── Serve SvelteKit UI ───────────────────────────────────────

# Mount static SvelteKit files LAST (after all API routes)
# On Android: files are in the app's assets directory
# copied to internal storage at first run
ui_dir = Path(__file__).parent / "ui"
if ui_dir.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(ui_dir), html=True),
        name="ui"
    )

# ─── Server Entry Point ───────────────────────────────────────

def start_server(port: int = 8765):
    """
    Start uvicorn server. This BLOCKS forever.
    Must be called from a background thread (done by PythonService).
    """
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
        # loop="asyncio" is the default and works on Android
    )
