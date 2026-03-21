"""
OmniGrab Android — yt-dlp wrapper utilities.

Shared helpers for building yt-dlp options used by server.py.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from omnigrab_android.quickjs import get_quickjs_args
from omnigrab_android.storage import get_download_directory


QUALITY_MAP: dict[str, str] = {
    "best":  "bestvideo+bestaudio/best",
    "2160":  "bestvideo[height<=2160]+bestaudio/best",
    "1080":  "bestvideo[height<=1080]+bestaudio/best",
    "720":   "bestvideo[height<=720]+bestaudio/best",
    "480":   "bestvideo[height<=480]+bestaudio/best",
    "360":   "bestvideo[height<=360]+bestaudio/best",
    "audio": "bestaudio/best",
}


def build_ydl_opts(
    *,
    quality: str = "best",
    fmt: str = "mp4",
    output_path: Optional[str] = None,
    embed_thumbnail: bool = True,
    embed_metadata: bool = True,
    download_subs: bool = False,
    sub_lang: str = "en",
    is_playlist: bool = False,
    playlist_items: Optional[str] = None,
    rate_limit: Optional[str] = None,
    cookies_path: Optional[str] = None,
    progress_hooks: Optional[list] = None,
    postprocessor_hooks: Optional[list] = None,
) -> dict[str, Any]:
    """Build a complete yt-dlp options dict."""
    output_dir = get_download_directory(output_path)
    is_audio = quality == "audio"
    format_selector = QUALITY_MAP.get(quality, QUALITY_MAP["best"])

    opts: dict[str, Any] = {
        "format": format_selector,
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "noplaylist": not is_playlist,
        "quiet": False,
        "no_warnings": False,
        "newline": True,
    }

    if progress_hooks:
        opts["progress_hooks"] = progress_hooks
    if postprocessor_hooks:
        opts["postprocessor_hooks"] = postprocessor_hooks

    postprocessors: list[dict] = []

    if is_audio or fmt in ("mp3", "m4a", "flac"):
        codec = fmt if fmt in ("mp3", "m4a", "flac") else "mp3"
        postprocessors.append({
            "key": "FFmpegExtractAudio",
            "preferredcodec": codec,
            "preferredquality": "0",
        })
    else:
        opts["merge_output_format"] = "mp4"

    if embed_thumbnail and not is_audio:
        postprocessors.append({"key": "EmbedThumbnail"})
    if embed_metadata:
        postprocessors.append({"key": "FFmpegMetadata"})

    if postprocessors:
        opts["postprocessors"] = postprocessors

    if download_subs:
        opts["writesubtitles"] = True
        opts["subtitleslangs"] = [sub_lang]

    if is_playlist and playlist_items:
        opts["playlist_items"] = playlist_items

    if is_playlist:
        opts["sleep_interval"] = 2

    if rate_limit and rate_limit.strip():
        opts["ratelimit"] = rate_limit

    if cookies_path and Path(cookies_path).exists():
        opts["cookiefile"] = cookies_path

    # QuickJS integration for YouTube
    qjs_args = get_quickjs_args()
    if qjs_args:
        opts["extractor_args"] = qjs_args

    return opts
