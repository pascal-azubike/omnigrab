"""
Android Scoped Storage utilities for OmniGrab.

Android 10+ uses scoped storage — apps cannot write to arbitrary paths.
On Android 13+, READ_EXTERNAL_STORAGE is replaced by READ_MEDIA_VIDEO, etc.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger("omnigrab.storage")


def get_download_directory(custom_path: Optional[str] = None) -> Path:
    """
    Return the correct download path for Android.

    Priority:
      1. custom_path argument (user explicitly chose a path in Settings)
      2. ANDROID_EXTERNAL_STORAGE env var (set by the Android runtime)
         → uses <external>/Download/omnigrab/
      3. ~/Downloads/omnigrab  (fallback for desktop testing)

    The directory is created if it does not exist.
    """
    if custom_path and custom_path.strip():
        path = Path(custom_path.strip())
    else:
        ext = os.environ.get("ANDROID_EXTERNAL_STORAGE")
        if ext:
            path = Path(ext) / "Download" / "omnigrab"
        else:
            path = Path.home() / "Downloads" / "omnigrab"

    path.mkdir(parents=True, exist_ok=True)
    return path


def request_storage_permissions() -> None:
    """
    Request Android storage permissions at runtime.

    On Android 13+ (API 33), READ_EXTERNAL_STORAGE is replaced by:
      - READ_MEDIA_VIDEO
      - READ_MEDIA_AUDIO
      - READ_MEDIA_IMAGES

    These permissions must also be declared in pyproject.toml.
    In BeeWare/Toga, runtime permission requests are handled through
    the Android activity via Chaquopy's Java bridge.
    This function is a stub — permissions are declared in pyproject.toml.
    """
    try:
        # Runtime permission request via Chaquopy (available inside APK)
        from java import jclass  # type: ignore[import]
        from android.content import Context  # type: ignore[import]
        activity = jclass("org.beeware.android.MainActivity").singletonThis
        sdk_int = jclass("android.os.Build$VERSION").SDK_INT

        if sdk_int >= 33:
            perms = [
                "android.permission.READ_MEDIA_VIDEO",
                "android.permission.READ_MEDIA_AUDIO",
                "android.permission.READ_MEDIA_IMAGES",
            ]
        else:
            perms = [
                "android.permission.READ_EXTERNAL_STORAGE",
                "android.permission.WRITE_EXTERNAL_STORAGE",
            ]

        activity.requestPermissions(perms, 1001)
        logger.info("Storage permissions requested: %s", perms)
    except Exception as e:
        # Not running inside the APK (desktop test) — safe to ignore
        logger.debug("Storage permission request skipped: %s", e)


def open_file_in_system(path: str) -> None:
    """
    Open a file using Android's Intent system.

    This launches the default app for the file type (e.g., a video player).
    Falls back to subprocess.Popen for desktop testing.
    """
    try:
        from java import jclass  # type: ignore[import]
        Intent = jclass("android.content.Intent")
        Uri = jclass("android.net.Uri")
        File = jclass("java.io.File")
        FileProvider = jclass("androidx.core.content.FileProvider")

        activity = jclass("org.beeware.android.MainActivity").singletonThis
        file_obj = File(path)
        uri = FileProvider.getUriForFile(
            activity,
            "com.omnigrab.omnigrab_android.fileprovider",
            file_obj,
        )
        intent = Intent(Intent.ACTION_VIEW)
        intent.setDataAndType(uri, _get_mime_type(path))
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        activity.startActivity(intent)
    except Exception:
        # Desktop fallback
        import subprocess
        import sys
        try:
            if sys.platform == "win32":
                os.startfile(path)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
        except Exception as e:
            logger.warning("Could not open file %s: %s", path, e)


def _get_mime_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    mime_map = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".mp3": "audio/mpeg",
        ".m4a": "audio/m4a",
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".opus": "audio/ogg",
    }
    return mime_map.get(ext, "*/*")
