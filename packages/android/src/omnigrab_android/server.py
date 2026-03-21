import asyncio
import json
import os
import uuid
import yt_dlp
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Dict, Any

app = FastAPI()

# Enable CORS for the WebView
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active downloads and progress queues
active_downloads: Dict[str, asyncio.Queue] = {}
download_statuses: Dict[str, Dict[str, Any]] = {}

def progress_hook(d: Dict[str, Any], download_id: str):
    if d['status'] == 'downloading':
        try:
            percent = float(d.get('_percent_str', '0%').replace('%', ''))
            progress = {
                "id": download_id,
                "status": "downloading",
                "percent": percent,
                "speed": d.get('_speed_str', '0 B/s'),
                "eta": d.get('_eta_str', '--:--'),
                "downloaded_bytes": d.get('downloaded_bytes', 0),
                "total_bytes": d.get('total_bytes', d.get('total_bytes_estimate', 0)),
                "current_title": d.get('info_dict', {}).get('title', 'Downloading...')
            }
            if download_id in active_downloads:
                asyncio.run_coroutine_threadsafe(active_downloads[download_id].put(progress), asyncio.get_event_loop())
            download_statuses[download_id] = progress
        except Exception as e:
            print(f"Error in progress hook: {e}")

@app.get("/health")
async def health():
    return {"status": "ok", "yt_dlp_version": yt_dlp.version.__version__}

@app.get("/info")
async def get_info(url: str):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return info
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

@app.post("/download")
async def start_download(payload: Dict[str, Any]):
    download_id = payload.get('id', str(uuid.uuid4()))
    active_downloads[download_id] = asyncio.Queue()
    
    # Run yt-dlp in a separate thread
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, run_ytdlp, payload, download_id)
    
    return {"download_id": download_id}

def run_ytdlp(payload: Dict[str, Any], download_id: str):
    ydl_opts = {
        'format': payload.get('quality', 'best'),
        'outtmpl': f"/storage/emulated/0/Download/OmniGrab/%(title)s.%(ext)s",
        'progress_hooks': [lambda d: progress_hook(d, download_id)],
        'postprocessors': []
    }
    
    if payload.get('embed_thumbnail'):
        ydl_opts['postprocessors'].append({'key': 'EmbedThumbnail'})
    if payload.get('embed_metadata'):
        ydl_opts['postprocessors'].append({'key': 'FFmpegMetadata'})
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([payload['url']])
            # Signal completion
            if download_id in active_downloads:
                asyncio.run_coroutine_threadsafe(active_downloads[download_id].put({"id": download_id, "status": "complete", "percent": 100}), asyncio.get_event_loop())
        except Exception as e:
            if download_id in active_downloads:
                asyncio.run_coroutine_threadsafe(active_downloads[download_id].put({"id": download_id, "status": "error", "error": str(e)}), asyncio.get_event_loop())

@app.get("/progress/{id}")
async def get_progress(id: str):
    if id not in active_downloads:
        raise HTTPException(status_code=404, detail="Download not found")
    
    async def event_generator():
        queue = active_downloads[id]
        while True:
            try:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data['status'] in ['complete', 'error', 'cancelled']:
                    break
            except Exception:
                break
        
        # Cleanup
        if id in active_downloads:
            del active_downloads[id]

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Serve UI files built by SvelteKit
ui_dir = os.path.join(os.path.dirname(__file__), "ui")
if os.path.exists(ui_dir):
    app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")
