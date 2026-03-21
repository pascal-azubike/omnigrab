"""
QuickJS integration for yt-dlp on Android.

QuickJS is used by yt-dlp to execute YouTube's JavaScript challenges,
which improves format availability for YouTube downloads.

The binary is expected at:
  src/omnigrab_android/bin/qjs  (ARM64 Android binary)

If the binary is absent, yt-dlp falls back to its built-in Python
implementation — basic downloads still work, but some YouTube formats
and age-restricted content may have limited availability.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("omnigrab.quickjs")

_BIN_PATHS = [
    Path(__file__).parent / "bin" / "qjs",
    Path("/data/data/com.omnigrab/files/qjs"),
    Path("/data/data/com.omnigrab.omnigrab_android/files/qjs"),
]


def find_quickjs_binary() -> Optional[str]:
    """Return the path to the QuickJS binary if it exists, else None."""
    for p in _BIN_PATHS:
        if p.exists() and p.is_file():
            return str(p)
    return None


def is_available() -> bool:
    """Return True if a QuickJS binary is present and executable."""
    path = find_quickjs_binary()
    if path is None:
        return False
    import os
    return os.access(path, os.X_OK)


def get_quickjs_args() -> dict:
    """
    Return yt-dlp extractor_args to use QuickJS for YouTube.
    Returns an empty dict if QuickJS is not available.
    """
    if not is_available():
        logger.warning(
            "QuickJS binary not found. Some YouTube formats may have limited "
            "availability. Place the ARM64 binary at: %s",
            str(_BIN_PATHS[0]),
        )
        return {}

    return {
        "youtube": {
            "player_client": ["web"],
        }
    }


def get_availability_message() -> str:
    """User-facing message about QuickJS availability."""
    if is_available():
        return f"QuickJS available at: {find_quickjs_binary()}"
    return (
        "QuickJS not available — some YouTube formats may be limited. "
        "Basic downloads still work. "
        "Add the ARM64 binary to packages/android/src/omnigrab_android/bin/qjs "
        "to enable full YouTube support."
    )
