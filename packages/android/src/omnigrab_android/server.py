"""
OmniGrab Android — FastAPI Backend Server
Serves the SvelteKit UI as static files AND provides
the download API (yt-dlp integration) on localhost:8765.
"""
import asyncio
import os
import uuid
from pathlib import Path
from typing import Any, AsyncGenerator, Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="OmniGrab Android API", version="1.0.0")

# Allow WebView requests (same host, different port context)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active progress queues: download_id → asyncio.Queue
_progress_queues: dict[str, asyncio.Queue] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Path helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_download_dir() -> Path:
    """
    Returns the correct download directory for Android.
    Uses ANDROID_EXTERNAL_STORAGE env var set by the Android runtime.
    Falls back to ~/Downloads for local development/testing.
    """
    ext = os.environ.get("ANDROID_EXTERNAL_STORAGE")
    if ext:
        path = Path(ext) / "Download" / "OmniGrab"
    else:
        path = Path.home() / "Downloads" / "OmniGrab"
    path.mkdir(parents=True, exist_ok=True)
    return path


# ──────────────────────────────────────────────────────────────────────────────
# Health & version
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    try:
        from yt_dlp.version import __version__
        version = __version__
    except Exception:
        version = "unknown"
    return {"status": "ok", "yt_dlp_version": version}


@app.get("/config")
async def get_config():
    """Return backend configuration/environment info."""
    return {
        "download_path": str(_get_download_dir()),
        "platform": "android",
    }


# ──────────────────────────────────────────────────────────────────────────────
# Video & Playlist Info
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/info")
async def get_info(url: str):
    """Fetch video metadata without downloading."""
    import yt_dlp

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "noplaylist": True,
        "simulate": True,
    }
    try:
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _extract_info, url, ydl_opts)
        formats = [
            {
                "format_id": f.get("format_id"),
                "ext": f.get("ext"),
                "height": f.get("height"),
                "fps": f.get("fps"),
                "filesize": f.get("filesize"),
                "vcodec": f.get("vcodec"),
                "acodec": f.get("acodec"),
                "format_note": f.get("format_note"),
            }
            for f in info.get("formats", [])
        ]
        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "uploader": info.get("uploader"),
            "platform": info.get("extractor_key"),
            "webpage_url": info.get("webpage_url") or url,
            "ext": info.get("ext"),
            "is_playlist": False,
            "formats": formats,
        }
    except Exception as exc:
        return JSONResponse(status_code=400, content={"error": _friendly_error(str(exc))})


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
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, _extract_info, url, ydl_opts)
        if info.get("_type") != "playlist":
            return JSONResponse(status_code=400, content={"error": "Not a playlist URL"})
        return {
            "playlist_title": info.get("title"),
            "playlist_uploader": info.get("uploader"),
            "playlist_thumbnail": info.get("thumbnail"),
            "total_count": len(info.get("entries", [])),
            "entries": [
                {
                    "index": i + 1,
                    "title": e.get("title"),
                    "url": e.get("url") or e.get("webpage_url"),
                    "thumbnail": e.get("thumbnail"),
                    "duration": e.get("duration"),
                }
                for i, e in enumerate(info.get("entries", []))
            ],
        }
    except Exception as exc:
        return JSONResponse(status_code=400, content={"error": _friendly_error(str(exc))})


def _extract_info(url: str, opts: Any) -> Any:
    import yt_dlp
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


# ──────────────────────────────────────────────────────────────────────────────
# Download
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/download")
async def start_download(payload: dict):
    """
    Start a download. Returns the download_id immediately.
    Client streams progress from /progress/{download_id}.
    """
    download_id = payload.get("id") or str(uuid.uuid4())
    url = payload["url"]
    quality = payload.get("quality", "best")
    fmt = payload.get("format", "mp4")
    embed_thumbnail = payload.get("embed_thumbnail", True)
    embed_metadata = payload.get("embed_metadata", True)
    download_subs = payload.get("download_subtitles", False)
    sub_lang = payload.get("subtitle_lang", "en")
    is_playlist = payload.get("is_playlist", False)
    playlist_items = payload.get("playlist_items")

    output_dir = _get_download_dir()

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

    # Create progress queue for this download
    q: asyncio.Queue = asyncio.Queue()
    _progress_queues[download_id] = q

    ydl_opts: dict[str, Any] = {
        "format": format_selector,
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "noplaylist": not is_playlist,
        "embed_thumbnail": embed_thumbnail,
        "embedmetadata": embed_metadata,
        "writesubtitles": download_subs,
        "subtitleslangs": [sub_lang] if download_subs else [],
        "quiet": False,
        "no_warnings": False,
        "progress_hooks": [_make_progress_hook(download_id)],
        "postprocessor_hooks": [_make_pp_hook(download_id)],
    }

    if fmt == "mp3":
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }]
    elif fmt in ("m4a", "flac"):
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": fmt,
            "preferredquality": "0",
        }]
    else:
        ydl_opts["merge_output_format"] = "mp4"

    if playlist_items:
        ydl_opts["playlist_items"] = playlist_items

    # Run synchronous yt-dlp in a thread pool so we don't block the event loop
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _run_download, ydl_opts, url, download_id)

    return {"download_id": download_id, "status": "started"}


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
                "filename": d.get("filename", ""),
            }
        elif status == "finished":
            event = {
                "id": download_id,
                "status": "processing",
                "percent": "100%",
                "filename": d.get("filename", ""),
            }
        else:
            return

        _push_event(download_id, event)

    return hook


def _make_pp_hook(download_id: str):
    def hook(d: dict):
        if d.get("status") == "finished":
            info = d.get("info_dict", {})
            event = {
                "id": download_id,
                "status": "complete",
                "percent": "100%",
                "filename": info.get("filepath") or info.get("filename", ""),
            }
            _push_event(download_id, event)

    return hook


def _push_event(download_id: str, event: dict):
    """Thread-safe push into the asyncio queue."""
    try:
        loop = asyncio.get_event_loop()
        loop.call_soon_threadsafe(
            _progress_queues[download_id].put_nowait,
            event
        )
    except Exception:
        pass


def _run_download(ydl_opts: Any, url: str, download_id: str):
    """Synchronous yt-dlp download, called from a thread pool executor."""
    import yt_dlp
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as exc:
        _push_event(download_id, {
            "id": download_id,
            "status": "error",
            "error": _friendly_error(str(exc)),
        })


def _friendly_error(raw: str) -> str:
    """Map yt-dlp error messages to user-friendly strings."""
    checks = [
        ("Sign in to confirm", "YouTube requires authentication. Import cookies in Settings."),
        ("Private video", "This video is private. Import cookies from an account with access."),
        ("Video unavailable", "This video is no longer available."),
        ("not available in your country", "This content is geo-blocked in your region."),
        ("Requested format is not available", "Selected quality not available. Try a lower quality."),
        ("Playlist does not exist", "Playlist not found. It may be private or deleted."),
        ("No supported JavaScript runtime", "JavaScript runtime missing. Some YouTube formats limited."),
    ]
    raw_lower = raw.lower()
    for key, msg in checks:
        if key.lower() in raw_lower:
            return msg
    return f"Download failed: {raw[0:300]}"  # type: ignore


# ──────────────────────────────────────────────────────────────────────────────
# Progress SSE Stream
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/progress/{download_id}")
async def progress_stream(download_id: str):
    """Server-Sent Events stream of download progress."""
    import json

    async def generator() -> AsyncGenerator[str, None]:
        q = _progress_queues.get(download_id)
        if not q:
            yield f"data: {json.dumps({'error': 'Download not found'})}\n\n"
            return

        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=30.0)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") in ("complete", "error", "cancelled"):
                    _progress_queues.pop(download_id, None)
                    break
            except asyncio.TimeoutError:
                yield ": ping\n\n"  # keepalive

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Cancel
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/cancel/{download_id}")
async def cancel_download(download_id: str):
    q = _progress_queues.get(download_id)
    if q:
        await q.put({"id": download_id, "status": "cancelled"})
        _progress_queues.pop(download_id, None)
    return {"status": "cancelled"}


# ──────────────────────────────────────────────────────────────────────────────
# History
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/history")
async def get_history():
    dl_dir = _get_download_dir()
    files: list[dict[str, Any]] = []
    for f in sorted(dl_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file() and not f.name.startswith("."):
            stat = f.stat()
            files.append({
                "filename": f.name,
                "path": str(f),
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })
    return {"files": files[:100]}  # type: ignore


# ──────────────────────────────────────────────────────────────────────────────
# Settings
# ──────────────────────────────────────────────────────────────────────────────

_settings_path = Path(__file__).parent / "settings.json"


@app.get("/settings")
async def get_settings():
    import json
    if _settings_path.exists():
        return json.loads(_settings_path.read_text())
    return {}


@app.post("/settings")
async def save_settings(settings: dict):
    import json
    _settings_path.write_text(json.dumps(settings, indent=2))
    return {"status": "saved"}


# ──────────────────────────────────────────────────────────────────────────────
# Static SvelteKit UI — MUST be mounted LAST after all API routes
# ──────────────────────────────────────────────────────────────────────────────

_ui_dir = Path(__file__).parent / "ui"
if _ui_dir.exists():
    app.mount("/", StaticFiles(directory=str(_ui_dir), html=True), name="ui")


# ──────────────────────────────────────────────────────────────────────────────
# Start function (called from app.py background thread)
# ──────────────────────────────────────────────────────────────────────────────

def start_server(port: int = 8765):
    """Start the FastAPI/uvicorn server. Runs in a daemon thread."""
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )
