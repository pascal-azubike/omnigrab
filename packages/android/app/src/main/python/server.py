import os
import asyncio
import threading
import json
import uuid
import stat
import sys
import socket
import ssl
from pathlib import Path
from typing import AsyncGenerator, Optional

import uvicorn
import yt_dlp
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# ─── Logging ──────────────────────────────────────────────────
# All logs are prefixed with OMNI: so you can run:
#   adb logcat | grep "OMNI:"
# to see only OmniGrab logs in a busy logcat stream.

def log(tag: str, msg: str):
    print(f"OMNI:[{tag}] {msg}", flush=True)

# Global ffmpeg path set by Kotlin via set_ffmpeg_path()
# before the server starts. Empty = no ffmpeg available.
_ffmpeg_path: str = ""

def set_ffmpeg_path(path: str) -> None:
    """Called by Kotlin/PythonService before start_server()."""
    global _ffmpeg_path
    _ffmpeg_path = path.strip()
    log("FFMPEG", f"Path received from Kotlin: '{_ffmpeg_path}'")
    if _ffmpeg_path:
        p = Path(_ffmpeg_path)
        if p.exists():
            log("FFMPEG", f"Binary exists. Size: {p.stat().st_size} bytes")
            # Ensure executable
            try:
                import stat as stat_module
                p.chmod(p.stat().st_mode |
                        stat_module.S_IXUSR |
                        stat_module.S_IXGRP |
                        stat_module.S_IXOTH)
                log("FFMPEG", "chmod +x OK")
            except Exception as e:
                log("FFMPEG", f"chmod failed (may still work): {e}")
        else:
            log("FFMPEG", f"WARNING: Path does not exist: {_ffmpeg_path}")
    else:
        log("FFMPEG", "No path provided — ffmpeg unavailable")


# ─── App ──────────────────────────────────────────────────────

app = FastAPI(title="OmniGrab Android API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active download progress queues  {download_id -> asyncio.Queue}
progress_queues: dict[str, asyncio.Queue] = {}

# ─── Platform Detection ───────────────────────────────────────

def is_android() -> bool:
    return (
        os.path.exists("/system/build.prop")
        or "ANDROID_DATA" in os.environ
        or hasattr(__builtins__, "__chaquopy__")
    )

# ─── Storage ─────────────────────────────────────────────────

def get_download_dir(custom_path: Optional[str] = None) -> Path:
    if custom_path and Path(custom_path).exists():
        path = Path(custom_path)
    elif is_android():
        # Use public Downloads directory so files are visible
        # in the phone's file manager and gallery apps.
        # /data/data/... is private and invisible to users.
        path = Path("/storage/emulated/0/Download/OmniGrab")
    else:
        path = Path.home() / "Downloads" / "OmniGrab"
    path.mkdir(parents=True, exist_ok=True)
    return path

# ─── ffmpeg Detection ─────────────────────────────────────────

def get_ffmpeg_location() -> Optional[str]:
    """
    Returns the DIRECTORY containing the ffmpeg binary,
    or None if ffmpeg is not available.
    yt-dlp's ffmpeg_location option expects the directory,
    not the full path to the binary.
    On desktop: return None (yt-dlp finds ffmpeg in PATH).
    On Android: use the path set by Kotlin via set_ffmpeg_path().
    """
    global _ffmpeg_path

    # Desktop — yt-dlp finds ffmpeg automatically via PATH
    if not is_android():
        return None

    # Android — use the path Kotlin gave us
    if _ffmpeg_path:
        p = Path(_ffmpeg_path)
        if p.exists():
            log("FFMPEG", f"Using ffmpeg at: {_ffmpeg_path}")
            return str(p.parent)  # Return DIRECTORY not file path
        else:
            log("FFMPEG", f"ffmpeg path set but file missing: {_ffmpeg_path}")

    log("FFMPEG", "No ffmpeg available — will use pre-merged formats")
    return None

# ─── Format Selector ─────────────────────────────────────────

def get_format_selector(quality: str, fmt: str) -> str:
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
        # No ffmpeg on Android — pre-merged only. No post-processing possible.
        quality_map = {
            "best":  "best[ext=mp4]/best[ext=webm]/best",
            "1080":  "best[height<=1080][ext=mp4]/best[height<=1080][ext=webm]/best",
            "720":   "best[height<=720][ext=mp4]/best[height<=720][ext=webm]/best",
            "480":   "best[height<=480][ext=mp4]/best[height<=480][ext=webm]/best",
            "360":   "best[height<=360][ext=mp4]/best[height<=360][ext=webm]/best",
            "audio": "bestaudio/best",
        }

    selector = quality_map.get(quality, "best[ext=mp4]/best")
    log("FORMAT", f"quality={quality} fmt={fmt} selector={selector} ffmpeg={has_ffmpeg}")
    return selector

# ─── API Endpoints ────────────────────────────────────────────

@app.get("/health")
async def health():
    import yt_dlp
    result = {
        "status": "ok",
        "platform": "android" if is_android() else "desktop",
        "yt_dlp_version": yt_dlp.version.__version__,
        "ffmpeg_available": get_ffmpeg_location() is not None,
        "python_version": sys.version,
    }
    log("HEALTH", str(result))
    return result

@app.get("/api/info")
async def get_info(url: str):
    import yt_dlp
    log("INFO", f"Fetching info for: {url}")
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
            result = {
                "title": info.get("title"),
                "thumbnail": info.get("thumbnail"),
                "duration": info.get("duration"),
                "uploader": info.get("uploader"),
                "platform": info.get("extractor_key"),
                "is_playlist": False,
                "url": info.get("webpage_url") or url,
                "webpage_url": info.get("webpage_url") or url,
                "ext": info.get("ext", "mp4"),
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
            log("INFO", f"OK: title={result['title']}")
            return result
    except Exception as e:
        log("INFO", f"ERROR: {e}")
        return JSONResponse(status_code=400, content={"error": _friendly_error(str(e))})

@app.get("/api/playlist")
async def get_playlist(url: str):
    import yt_dlp
    log("PLAYLIST", f"Fetching playlist: {url}")
    opts = {"quiet": True, "extract_flat": True, "noplaylist": False}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info.get("_type") != "playlist":
                return JSONResponse(status_code=400, content={"error": "Not a playlist URL"})
            entries = info.get("entries", [])
            log("PLAYLIST", f"OK: {len(entries)} entries")
            return {
                "playlist_title": info.get("title"),
                "playlist_uploader": info.get("uploader"),
                "playlist_thumbnail": info.get("thumbnail"),
                "total_count": len(entries),
                "entries": [
                    {
                        "index": i + 1,
                        "title": e.get("title"),
                        "url": e.get("url") or e.get("webpage_url"),
                        "thumbnail": e.get("thumbnail"),
                        "duration": e.get("duration"),
                    }
                    for i, e in enumerate(entries)
                ],
            }
    except Exception as e:
        log("PLAYLIST", f"ERROR: {e}")
        return JSONResponse(status_code=400, content={"error": _friendly_error(str(e))})

@app.get("/api/debug/state")
async def get_debug_state():
    state = {
        "active_queues": list(progress_queues.keys()),
        "ffmpeg_status": get_ffmpeg_location() is not None,
        "is_android": is_android(),
        "download_dir": str(get_download_dir()),
    }
    log("DEBUG_STATE", str(state))
    return state

@app.get("/api/debug/network")
async def get_debug_network():
    """Diagnostic endpoint to identify root cause of Android network timeouts."""
    import socket
    import http.client
    import ssl
    import sys
    
    results: dict[str, object] = {}
    
    # 1. DNS Resolution Test
    target_host = "rr5---sn-4g5ednsr.googlevideo.com" # Example CDN host
    try:
        # Check what the system returns by default
        results["dns_default"] = [addr[4][0] for addr in socket.getaddrinfo(target_host, 443)]
        # Check if IPv4 is specifically available
        results["dns_ipv4"] = [addr[4][0] for addr in socket.getaddrinfo(target_host, 443, socket.AF_INET)]
    except Exception as e:
        results["dns_error"] = str(e)

    # 2. SSL/TLS Handshake Test
    try:
        results["ssl_ca_path"] = ssl.get_default_verify_paths().cafile
        try:
            import certifi
            results["certifi_where"] = certifi.where()
        except ImportError:
            results["certifi_where"] = "not_installed"
    except Exception as e:
        results["ssl_info_error"] = str(e)

    # 3. Basic HTTP Connectivity (IPv4)
    try:
        conn = http.client.HTTPSConnection("www.youtube.com", timeout=10)
        conn.request("HEAD", "/")
        resp = conn.getresponse()
        results["youtube_conn"] = f"OK {resp.status}"
        conn.close()
    except Exception as e:
        results["youtube_conn_error"] = str(e)

    log("DEBUG_NETWORK", str(results))
    return results

# ─── Download ─────────────────────────────────────────────────

@app.post("/api/download")
async def start_download(payload: dict):
    log("DOWNLOAD", f"=== NEW DOWNLOAD REQUEST ===")
    log("DOWNLOAD", f"Payload keys: {list(payload.keys())}")

    download_id = payload.get("id") or str(uuid.uuid4())
    url = payload.get("url")

    log("DOWNLOAD", f"ID={download_id}")
    log("DOWNLOAD", f"URL={url}")

    if not url:
        log("DOWNLOAD", "ABORT: Missing URL")
        return JSONResponse(status_code=400, content={"error": "Missing URL"})

    quality  = payload.get("quality", "best")
    fmt      = payload.get("format", "mp4")
    embed_th = payload.get("embed_thumbnail", True)
    embed_md = payload.get("embed_metadata", True)
    is_pl    = payload.get("is_playlist", False)
    pl_items = payload.get("playlist_items")
    co_path  = payload.get("cookies_path")
    out_path = payload.get("output_path")

    output_dir = get_download_dir(out_path)
    ffmpeg_loc = get_ffmpeg_location()
    log("DOWNLOAD", f"ffmpeg_loc={ffmpeg_loc}")

    # Create queue and capture the RUNNING event loop
    q: asyncio.Queue = asyncio.Queue()
    progress_queues[download_id] = q
    log("DOWNLOAD", f"Queue created. Active queues: {list(progress_queues.keys())}")

    loop = asyncio.get_running_loop()
    log("DOWNLOAD", f"Event loop captured: {id(loop)}")

    opts: dict = {
        "format": get_format_selector(quality, fmt),
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "noplaylist": not is_pl,
        "quiet": False,
        "no_warnings": False,
        "logger": YdlLogger(),
        # Force IPv4 — prevents Errno 101 on Android
        # from broken IPv6 routing on carriers/routers
        "source_address": "0.0.0.0",
        "force_ipv4": True,
        "restrictfilenames": True,
        "cachedir": False,
        "concurrent_fragment_downloads": 1,
        "check_formats": False,
        # extractor-specific args to help bypass PO Token/Account issues
        "extractor_args": {
            "youtube": {
                "player_client": ["web", "android"],
                "player_skip": ["webpage", "configs"],
            }
        },
        # Network resilience
        "nocheckcertificate": True,
        "geo_bypass": True,
        "socket_timeout": 120,
        "retries": 10,
        "fragment_retries": 10,
        "progress_hooks": [_make_progress_hook(download_id, loop)],
        "postprocessor_hooks": [_make_pp_hook(download_id, loop)],
    }

    if ffmpeg_loc:
        opts["ffmpeg_location"] = ffmpeg_loc
        if fmt == "mp3":
            opts["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "0"}]
        elif fmt in ("m4a", "flac"):
            opts["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": fmt, "preferredquality": "0"}]
        else:
            opts["merge_output_format"] = "mp4"

    if pl_items:
        opts["playlist_items"] = pl_items

    if co_path and Path(co_path).exists():
        opts["cookiefile"] = co_path

    # Immediately signal the UI that download has been initialized
    # so it does not hang on "Waiting to start" if yt-dlp suffers a long TTFB.
    q.put_nowait({
        "id": download_id,
        "status": "downloading",
        "percent": "0.1%",
        "speed": "0MiB/s",
        "eta": "Connecting..."
    })

    log("DOWNLOAD", f"Launching background thread for {download_id}")
    loop.run_in_executor(None, _run_download, opts, url, download_id, loop)
    log("DOWNLOAD", f"Thread dispatched. Returning download_id={download_id}")
    return {"download_id": download_id, "status": "started"}


@app.post("/api/cancel/{download_id}")
async def cancel_download(download_id: str):
    log("CANCEL", f"Cancelling {download_id}")
    q = progress_queues.get(download_id)
    if q:
        event = {"id": download_id, "status": "cancelled", "percent": 0,
                 "speed": "", "eta": "", "downloaded_bytes": 0,
                 "total_bytes": 0, "current_title": ""}
        await q.put(event)
        progress_queues.pop(download_id, None)
    return {"status": "cancelled"}


@app.get("/api/progress/{download_id}")
async def progress_stream(download_id: str):
    log("PROGRESS", f"=== SSE CONNECTED for {download_id} ===")
    log("PROGRESS", f"Active queues at connect time: {list(progress_queues.keys())}")

    async def event_generator() -> AsyncGenerator[str, None]:
        q = progress_queues.get(download_id)
        if not q:
            log("PROGRESS", f"WARN: No queue found for {download_id} — sending not-found event")
            yield f"data: {json.dumps({'id': download_id, 'status': 'error', 'error': 'Download not found'})}\n\n"
            return

        log("PROGRESS", f"Queue found, entering event loop for {download_id}")
        tick = 0
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=15.0)
                log("PROGRESS", f"Event received: status={event.get('status')} id={event.get('id')}")
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") in ("complete", "error", "cancelled"):
                    log("PROGRESS", f"Terminal status '{event.get('status')}' — closing SSE for {download_id}")
                    progress_queues.pop(download_id, None)
                    break
            except asyncio.TimeoutError:
                tick += 1
                log("PROGRESS", f"Heartbeat tick {tick} for {download_id} (queue still alive)")
                yield ": heartbeat\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ─── Settings ─────────────────────────────────────────────────

@app.get("/api/settings")
async def get_settings():
    settings_path = _get_settings_path()
    if settings_path.exists():
        return json.loads(settings_path.read_text())
    return {"download_path": str(get_download_dir())}

@app.post("/api/settings")
async def save_settings(settings: dict):
    settings_path = _get_settings_path()
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(settings, indent=2))
    return {"status": "saved"}

def _get_settings_path() -> Path:
    if is_android():
        return Path("/data/data/com.omnigrab.android/files/settings.json")
    return Path.home() / ".omnigrab" / "settings.json"

@app.get("/api/history")
async def get_history():
    dl_dir = get_download_dir()
    files = []
    if dl_dir.exists():
        for f in dl_dir.iterdir():
            if f.is_file():
                files.append({
                    "filename": f.name,
                    "size": f.stat().st_size,
                    "path": str(f),
                })
    return {"files": files, "count": len(files)}

@app.post("/api/open-folder")
async def open_folder(body: dict):
    # No-op on Android
    return {"status": "ok"}

# ─── yt-dlp Logger ───────────────────────────────────────────

class YdlLogger:
    def debug(self, msg):
        if msg.startswith("[debug] "):
            log("YDL_DEBUG", msg)
        else:
            self.info(msg)
    def info(self, msg):
        log("YDL_INFO", msg)
    def warning(self, msg):
        log("YDL_WARN", msg)
    def error(self, msg):
        log("YDL_ERROR", msg)

# ─── Progress Hooks ───────────────────────────────────────────

def _make_progress_hook(download_id: str, loop: asyncio.AbstractEventLoop):
    """Returns a yt-dlp progress hook that safely posts events to the SSE queue."""
    def hook(d):
        status = d.get("status")
        log("HOOK", f"yt-dlp status={status} for {download_id}")
        try:
            if status == "downloading":
                event = {
                    "id": download_id,
                    "status": "downloading",
                    "percent": d.get("_percent_str", "0%").strip(),
                    "speed": d.get("_speed_str", "N/A").strip(),
                    "eta": d.get("_eta_str", "N/A").strip(),
                    "downloaded_bytes": d.get("downloaded_bytes", 0),
                    "total_bytes": d.get("total_bytes") or d.get("total_bytes_estimate", 0),
                    "current_title": d.get("filename", ""),
                }
                log("HOOK", f"Posting downloading event: {event['percent']}")
            elif status == "finished":
                event = {
                    "id": download_id,
                    "status": "processing",
                    "percent": "100%",
                    "current_title": d.get("filename", ""),
                    "downloaded_bytes": d.get("downloaded_bytes", 0),
                    "total_bytes": d.get("total_bytes", 0),
                    "speed": "",
                    "eta": "",
                }
                log("HOOK", f"Posting processing event for {download_id}")
            else:
                log("HOOK", f"Ignoring status={status}")
                return

            q = progress_queues.get(download_id)
            if q is None:
                log("HOOK", f"WARN: No queue for {download_id}, event lost!")
                return

            log("HOOK", f"Calling loop.call_soon_threadsafe (loop id={id(loop)})")
            loop.call_soon_threadsafe(q.put_nowait, event)
            log("HOOK", "call_soon_threadsafe returned OK")
        except Exception as e:
            log("HOOK", f"EXCEPTION in hook: {e}")

    return hook


def _make_pp_hook(download_id: str, loop: asyncio.AbstractEventLoop):
    """Returns a yt-dlp postprocessor hook that signals completion."""
    def hook(d):
        log("PP_HOOK", f"pp status={d.get('status')} for {download_id}")
        try:
            if d.get("status") == "finished":
                event = {
                    "id": download_id,
                    "status": "complete",
                    "percent": "100%",
                    "filename": d.get("info_dict", {}).get("filepath", ""),
                    "current_title": d.get("info_dict", {}).get("title", ""),
                    "downloaded_bytes": 0,
                    "total_bytes": 0,
                    "speed": "",
                    "eta": "",
                }
                log("PP_HOOK", f"Posting complete event for {download_id}")
                q = progress_queues.get(download_id)
                if q:
                    loop.call_soon_threadsafe(q.put_nowait, event)
                else:
                    log("PP_HOOK", f"WARN: No queue for {download_id}")
        except Exception as e:
            log("PP_HOOK", f"EXCEPTION: {e}")

    return hook


def _run_download(opts: dict, url: str, download_id: str, loop: asyncio.AbstractEventLoop):
    """Runs in a thread pool executor. Downloads using yt-dlp."""
    import yt_dlp
    log("RUN_DL", f"=== Thread started for {download_id} ===")
    log("RUN_DL", f"URL={url}")
    log("RUN_DL", f"Format={opts.get('format')}")
    log("RUN_DL", f"Output={opts.get('outtmpl')}")
    log("RUN_DL", f"Using loop id={id(loop)}")
    log("DOWNLOAD", f"Starting yt-dlp run for {download_id}")
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            # First, extract info again to get the final download URL
            info = ydl.extract_info(url, download=False)
            if info:
                log("DOWNLOAD_INFO", f"Title: {info.get('title', 'N/A')}")
                log("DOWNLOAD_INFO", f"Format: {info.get('format_id', 'N/A')}")
                # Some formats don't have a single URL (DASH)
                u = info.get('url') or (info.get('formats', [{}])[-1].get('url'))
                log("DOWNLOAD_INFO", f"CDN URL Prefix: {str(u)[:50]}...")
            
            # Start the actual download
            log("DOWNLOAD", "Calling ydl.download()...")
            ydl.download([url])
        
        log("DOWNLOAD", f"yt-dlp finished for {download_id}")
    except Exception as e:
        log("RUN_DL", f"EXCEPTION during download: {type(e).__name__}: {e}")
        q = progress_queues.get(download_id)
        if q:
            try:
                error_event = {
                    "id": download_id,
                    "status": "error",
                    "error": _friendly_error(str(e)),
                    "percent": 0,
                    "speed": "",
                    "eta": "",
                    "downloaded_bytes": 0,
                    "total_bytes": 0,
                    "current_title": "",
                }
                loop.call_soon_threadsafe(q.put_nowait, error_event)
                log("RUN_DL", "Error event dispatched to queue")
            except Exception as inner:
                log("RUN_DL", f"Failed to dispatch error event: {inner}")
        else:
            log("RUN_DL", f"No queue for {download_id} to dispatch error event")


# ─── Error Messages ───────────────────────────────────────────

def _friendly_error(raw: str) -> str:
    errors = {
        "Sign in to confirm": (
            "YouTube requires authentication. Enable 'Use Cookies' in settings."
        ),
        "This video is not available": "Video is unavailable in your region.",
        "Private video": "This video is private.",
        "Video unavailable": "Video is unavailable.",
        "No supported JavaScript runtime": (
            "yt-dlp requires a JavaScript engine for some sites. "
            "Try a simpler URL or check for updates."
        ),
    }
    for key, msg in errors.items():
        if key in raw:
            return msg
    return raw[:200]  # Truncate long stack traces


# ─── Static Files & Startup ───────────────────────────────────

def setup_static_files():
    """Mount the SvelteKit build output as static files."""
    # On Android with Chaquopy, Python files are extracted next to each other.
    # The SvelteKit build lives in the 'ui' folder beside server.py.
    static_dir = Path(__file__).parent / "ui"
    if static_dir.exists():
        # First, mount the static files directory for real files
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
        log("STARTUP", f"Serving static files from {static_dir}")

        # Add a custom exception handler for 404 Not Found
        # so that SPA routes (like /settings) fall back to index.html
        from fastapi.responses import FileResponse
        from fastapi import Request
        from starlette.exceptions import HTTPException as StarletteHTTPException

        @app.exception_handler(StarletteHTTPException)
        async def spa_fallback(request: Request, exc: StarletteHTTPException):
            if exc.status_code == 404:
                # But don't fallback for API routes
                if not request.url.path.startswith("/api/"):
                    index_path = static_dir / "index.html"
                    if index_path.exists():
                        return FileResponse(index_path)
            # Otherwise return normal 404 response
            return fastapi.responses.JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail}
            )
    else:
        log("STARTUP", f"ERROR: No UI dir at {static_dir} — listing parent:")
        parent = Path(__file__).parent
        try:
            contents = list(parent.iterdir())
            log("STARTUP", f"Parent contents: {[str(c.name) for c in contents]}")
        except Exception as e:
            log("STARTUP", f"Could not list parent: {e}")


def start_server(port: int = 8765, host: str = "127.0.0.1"):
    # ── IPv4 Patch ─────────────────────────────────────────
    # Force ALL Python socket connections to use IPv4.
    # This prevents Errno 101 Network Unreachable on Android
    # caused by broken IPv6 routing on carriers and routers.
    # Must be applied before uvicorn starts its own sockets.
    if is_android():
        import socket as _socket
        _orig_getaddrinfo = _socket.getaddrinfo
        def _ipv4_getaddrinfo(host, port, family=0, *args, **kwargs):
            return _orig_getaddrinfo(
                host, port,
                _socket.AF_INET,  # Force IPv4
                *args, **kwargs
            )
        _socket.getaddrinfo = _ipv4_getaddrinfo
        log("STARTUP", "Global socket.getaddrinfo IPv4 patch applied")

        # Also patch asyncio loop getaddrinfo if possible
        try:
            import asyncio as _asyncio
            _orig_loop_getaddrinfo = _asyncio.AbstractEventLoop.getaddrinfo
            def _loop_ipv4_getaddrinfo(self, host, port, *, family=0, type=0, proto=0, flags=0):
                return _orig_loop_getaddrinfo(self, host, port, family=_socket.AF_INET, type=type, proto=proto, flags=flags)
            _asyncio.AbstractEventLoop.getaddrinfo = _loop_ipv4_getaddrinfo
            log("STARTUP", "Asyncio loop.getaddrinfo IPv4 patch applied")
        except Exception as e:
            log("STARTUP", f"Asyncio patch failed: {e}")
    # ───────────────────────────────────────────────────────

    log("STARTUP", f"=== OmniGrab Server Starting ===")
    log("STARTUP", f"Platform: {'Android' if is_android() else 'Desktop'}")
    log("STARTUP", f"Python: {sys.version}")
    
    try:
        import yt_dlp
        log("STARTUP", f"yt-dlp version: {yt_dlp.version.__version__}")
    except Exception:
        log("STARTUP", "yt-dlp version: Unknown")

    log("STARTUP", f"Binding to {host}:{port}")
    log("STARTUP", f"Download dir: {get_download_dir()}")
    log("STARTUP", f"ffmpeg: {get_ffmpeg_location()}")
    setup_static_files()
    uvicorn.run(app, host=host, port=port, log_level="info")
