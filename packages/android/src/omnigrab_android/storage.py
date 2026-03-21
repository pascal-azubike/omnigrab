import os

def get_download_dir():
    # Attempt to use standard Android Download directory
    base_dir = "/storage/emulated/0/Download/OmniGrab"
    if not os.path.exists(base_dir):
        try:
            os.makedirs(base_dir, exist_ok=True)
        except Exception:
            # Fallback to internal app storage
            base_dir = os.path.join(os.path.expanduser("~"), "downloads")
            os.makedirs(base_dir, exist_ok=True)
    return base_dir

def ensure_legal_filename(filename: str):
    return "".join([c for c in filename if c.isalnum() or c in (' ', '.', '_', '-')]).rstrip()
