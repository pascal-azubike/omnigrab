"""
OmniGrab Android — FastAPI Backend Server

Serves the SvelteKit UI as static files AND provides the download API.
Runs on localhost:8765 inside the Toga app process.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional

import uvicorn
import yt_dlp
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger("omnigrab.server")

# ─────────────────────────────────────────────────────────────────────
# App bootstrap
# ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="OmniGrab Android API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-flight downloads: download_id → asyncio.Queue
progress_queues: Dict[str, asyncio.Queue] = {}

# ─────────────────────────────────────────────────────────────────────
# Path helpers
# ─────────────────────────────────────────────────────────────────────

def get_download_dir(custom_path: Optional[str] = None) -> Path:
    """
    Return the directory where downloads are saved.
    Priority:
      1. custom_path argument from the request payload
      2. ANDROID_EXTERNAL_STORAGE env var (set by Android runtime)
      3. ~/Downloads/OmniGrab fallback for desktop testing
    """
    if custom_path and custom_path.strip():
        path = Path(custom_path.strip())
    else:
        ext = os.environ.get("ANDROID_EXTERNAL_STORAGE")
        if ext:
            path = Path(ext) / "Download" / "OmniGrab"
        else:
            path = Path.home() / "Downloads" / "OmniGrab"
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_settings_path() -> Path:
    return Path(__file__).parent / "settings.json"


def load_settings() -> dict:
    p = get_settings_path()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def save_settings(data: dict) -> None:
    get_settings_path().write_text(json.dumps(data, indent=2), encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────
# Error mapping
# ─────────────────────────────────────────────────────────────────────

def friendly_error(raw: str) -> str:
    table = [
        ("Sign in to confirm", "YouTube requires authentication. Import your browser cookies in Settings → Authentication."),
        ("bot", "YouTube is treating this as a bot request. Import browser cookies in Settings → Authentication."),
        ("Private video", "This video is private. Import cookies from an account with access in Settings."),
        ("Video unavailable", "This video is no longer available on this platform."),
        ("has been removed", "This video has been removed by the uploader."),
        ("not available in your country", "This content is geo-blocked in your region."),
        ("Requested format is not available", "Selected quality not available. Try a lower quality setting."),
        ("Playlist does not exist", "Playlist not found — it may be private or deleted."),
        ("Unable to extract", "Could not extract video info. The URL may not be supported."),
        ("ffmpeg", "ffmpeg is unavailable — audio extraction and merging may fail."),
        ("network", "Connection failed. Please check your internet connection."),
        ("Connection", "Connection failed. Please check your internet connection."),
        ("timed out", "Request timed out. Please try again."),
        ("No supported JavaScript runtime", "Limited YouTube format availability (no JS runtime). Basic downloads still work."),
    ]
    for key, msg in table:
        if key.lower() in raw.lower():
            return msg
    return f"Download failed: {raw[:300]}"


# ─────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    settings = load_settings()
    return {
        "status": "ok",
        "yt_dlp_version": yt_dlp.version.__version__,
        "download_path": str(get_download_dir(settings.get("download_path"))),
    }


# ─────────────────────────────────────────────────────────────────────
# Video / Playlist info
# ─────────────────────────────────────────────────────────────────────

@app.get("/info")
async def get_info(url: str):
    """Fetch video metadata without downloading."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "noplaylist": True,
        "simulate": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return JSONResponse(status_code=400, content={"error": "No info returned"})

            formats = [
                {
                    "format_id": f.get("format_id", ""),
                    "ext": f.get("ext", ""),
                    "height": f.get("height"),
                    "fps": f.get("fps"),
                    "filesize": f.get("filesize") or f.get("filesize_approx"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                    "format_note": f.get("format_note", ""),
                }
                for f in info.get("formats", [])
                if f.get("height") or f.get("vcodec") not in (None, "none")
            ]

            return {
                "id": info.get("id", ""),
                "title": info.get("title", "Unknown"),
                "thumbnail": info.get("thumbnail", ""),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader") or info.get("channel", "Unknown"),
                "platform": info.get("extractor_key", "Unknown"),
                "webpage_url": info.get("webpage_url", url),
                "ext": info.get("ext", "mp4"),
                "is_playlist": False,
                "formats": formats,
            }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": friendly_error(str(e))})


@app.get("/playlist")
async def get_playlist(url: str):
    """Fetch playlist metadata without downloading."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "noplaylist": False,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return JSONResponse(status_code=400, content={"error": "No playlist info returned"})

            entries = info.get("entries", [])
            return {
                "playlist_title": info.get("title", "Playlist"),
                "playlist_uploader": info.get("uploader") or info.get("channel", "Unknown"),
                "playlist_thumbnail": info.get("thumbnail", ""),
                "total_count": len(entries),
                "entries": [
                    {
                        "index": i + 1,
                        "title": e.get("title", f"Video {i+1}"),
                        "url": e.get("url") or e.get("webpage_url", ""),
                        "thumbnail": e.get("thumbnail", ""),
                        "duration": e.get("duration", 0),
                    }
                    for i, e in enumerate(entries)
                    if e
                ],
            }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": friendly_error(str(e))})


# ─────────────────────────────────────────────────────────────────────
# Download
# ─────────────────────────────────────────────────────────────────────

@app.post("/download")
async def start_download(payload: dict):
    """
    Start a download in a background thread.
    Returns download_id immediately. Client polls /progress/{id} for SSE.

    Payload fields:
      url, id?, quality, format, output_path?, embed_thumbnail,
      embed_metadata, download_subtitles, subtitle_lang,
      is_playlist, playlist_items?, rate_limit?, cookies_path?
    """
    download_id: str = payload.get("id") or str(uuid.uuid4())
    url: str = payload.get("url", "")
    quality: str = payload.get("quality", "best")
    fmt: str = payload.get("format", "mp4")
    output_path: Optional[str] = payload.get("output_path") or payload.get("outputPath")
    embed_thumbnail: bool = payload.get("embed_thumbnail", True)
    embed_metadata: bool = payload.get("embed_metadata", True)
    download_subs: bool = payload.get("download_subtitles", False)
    sub_lang: str = payload.get("subtitle_lang", "en")
    is_playlist: bool = payload.get("is_playlist", False)
    playlist_items: Optional[str] = payload.get("playlist_items")
    rate_limit: Optional[str] = payload.get("rate_limit")
    cookies_path: Optional[str] = payload.get("cookies_path")

    if not url:
        return JSONResponse(status_code=400, content={"error": "url is required"})

    # Resolve output directory — prefer per-request path, then settings, then default
    settings = load_settings()
    effective_path = output_path or settings.get("download_path")
    output_dir = get_download_dir(effective_path)

    # Quality → yt-dlp format selector
    quality_map = {
        "best":  "bestvideo+bestaudio/best",
        "2160":  "bestvideo[height<=2160]+bestaudio/best",
        "1080":  "bestvideo[height<=1080]+bestaudio/best",
        "720":   "bestvideo[height<=720]+bestaudio/best",
        "480":   "bestvideo[height<=480]+bestaudio/best",
        "360":   "bestvideo[height<=360]+bestaudio/best",
        "audio": "bestaudio/best",
    }
    format_selector = quality_map.get(quality, "bestvideo+bestaudio/best")
    is_audio = quality == "audio"

    # Create SSE progress queue
    q: asyncio.Queue = asyncio.Queue()
    progress_queues[download_id] = q

    # Build yt-dlp options
    ydl_opts: dict[str, Any] = {
        "format": format_selector,
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "noplaylist": not is_playlist,
        "quiet": False,
        "no_warnings": False,
        "progress_hooks": [_make_progress_hook(download_id)],
        "postprocessor_hooks": [_make_pp_hook(download_id)],
        "newline": True,
    }

    postprocessors: list[dict] = []

    if is_audio or fmt in ("mp3", "m4a", "flac"):
        codec = fmt if fmt in ("mp3", "m4a", "flac") else "mp3"
        postprocessors.append({
            "key": "FFmpegExtractAudio",
            "preferredcodec": codec,
            "preferredquality": "0",
        })
    else:
        ydl_opts["merge_output_format"] = "mp4"

    if embed_thumbnail and not is_audio:
        postprocessors.append({"key": "EmbedThumbnail"})
    if embed_metadata:
        postprocessors.append({"key": "FFmpegMetadata"})

    if postprocessors:
        ydl_opts["postprocessors"] = postprocessors

    if download_subs:
        ydl_opts.update({
            "writesubtitles": True,
            "subtitleslangs": [sub_lang],
        })

    if is_playlist and playlist_items:
        ydl_opts["playlist_items"] = playlist_items

    if is_playlist:
        ydl_opts["sleep_interval"] = 2

    if rate_limit and rate_limit.strip():
        ydl_opts["ratelimit"] = rate_limit

    if cookies_path and Path(cookies_path).exists():
        ydl_opts["cookiefile"] = cookies_path

    # Run in thread pool (yt-dlp is synchronous)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _run_download, ydl_opts, url, download_id)

    return {"download_id": download_id, "status": "started", "output_dir": str(output_dir)}


def _make_progress_hook(download_id: str):
    def hook(d: dict):
        status = d.get("status")
        if status == "downloading":
            event = {
                "id": download_id,
                "status": "downloading",
                "percent": d.get("_percent_str", "0%").strip(),
                "speed": d.get("_speed_str", "N/A").strip(),
                "eta": d.get("_eta_str", "N/A").strip(),
                "downloaded": d.get("downloaded_bytes", 0),
                "total": d.get("total_bytes") or d.get("total_bytes_estimate", 0),
                "filename": Path(d.get("filename", "")).name,
            }
            _queue_put(download_id, event)
        elif status == "finished":
            event = {
                "id": download_id,
                "status": "processing",
                "percent": "100%",
                "filename": Path(d.get("filename", "")).name,
            }
            _queue_put(download_id, event)
    return hook


def _make_pp_hook(download_id: str):
    def hook(d: dict):
        if d.get("status") == "finished":
            info = d.get("info_dict", {})
            filename = info.get("filepath") or info.get("filename", "")
            event = {
                "id": download_id,
                "status": "complete",
                "percent": "100%",
                "filename": Path(filename).name if filename else "",
            }
            _queue_put(download_id, event)
    return hook


def _queue_put(download_id: str, event: dict):
    try:
        loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(
            progress_queues[download_id].put_nowait, event
        )
    except Exception:
        pass


def _run_download(ydl_opts: dict, url: str, download_id: str):
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        raw = str(e)
        logger.error("Download %s failed: %s", download_id, raw)
        _queue_put(download_id, {
            "id": download_id,
            "status": "error",
            "error": friendly_error(raw),
        })


# ─────────────────────────────────────────────────────────────────────
# SSE progress stream
# ─────────────────────────────────────────────────────────────────────

@app.get("/progress/{download_id}")
async def progress_stream(download_id: str):
    """Server-Sent Events stream for a specific download."""
    async def generator() -> AsyncGenerator[str, None]:
        q = progress_queues.get(download_id)
        if not q:
            yield f"data: {json.dumps({'error': 'Download not found'})}\n\n"
            return

        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=25.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") in ("complete", "error", "cancelled"):
                    progress_queues.pop(download_id, None)
                    break
            except asyncio.TimeoutError:
                yield ": ping\n\n"  # keepalive

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─────────────────────────────────────────────────────────────────────
# Cancel
# ─────────────────────────────────────────────────────────────────────

@app.post("/cancel/{download_id}")
async def cancel_download(download_id: str):
    q = progress_queues.pop(download_id, None)
    if q:
        await q.put({"id": download_id, "status": "cancelled"})
    return {"status": "cancelled"}


# ─────────────────────────────────────────────────────────────────────
# History
# ─────────────────────────────────────────────────────────────────────

@app.get("/history")
async def get_history():
    settings = load_settings()
    dl_dir = get_download_dir(settings.get("download_path"))
    files = []
    try:
        for f in sorted(dl_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if f.is_file() and not f.name.startswith("."):
                stat = f.stat()
                files.append({
                    "filename": f.name,
                    "path": str(f),
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })
            if len(files) >= 100:
                break
    except Exception as e:
        logger.warning("History error: %s", e)
    return {"files": files}


# ─────────────────────────────────────────────────────────────────────
# Settings
# ─────────────────────────────────────────────────────────────────────

@app.get("/settings")
async def get_settings_route():
    settings = load_settings()
    # Always include effective download path
    settings.setdefault(
        "download_path",
        str(get_download_dir(settings.get("download_path")))
    )
    return settings


@app.post("/settings")
async def save_settings_route(settings: dict):
    # Validate download_path if provided
    if "download_path" in settings and settings["download_path"]:
        try:
            p = Path(settings["download_path"])
            p.mkdir(parents=True, exist_ok=True)
            settings["download_path"] = str(p)
        except Exception as e:
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid download path: {e}"}
            )
    save_settings(settings)
    return {"status": "saved", "settings": settings}


@app.get("/config")
async def get_config():
    """Alias for /settings — used by api.ts getDefaultDownloadPath."""
    settings = load_settings()
    return {
        "download_path": str(get_download_dir(settings.get("download_path"))),
    }


# ─────────────────────────────────────────────────────────────────────
# Static SvelteKit UI (must be mounted LAST — after all API routes)
# ─────────────────────────────────────────────────────────────────────

_ui_dir = Path(__file__).parent / "ui"
if _ui_dir.exists():
    app.mount("/", StaticFiles(directory=str(_ui_dir), html=True), name="ui")


# ─────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────

def start_server(port: int = 8765):
    """Start the FastAPI/uvicorn server (blocking). Call from a daemon thread."""
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
        loop="asyncio",
    )


def get_server_port() -> int:
    return 8765
