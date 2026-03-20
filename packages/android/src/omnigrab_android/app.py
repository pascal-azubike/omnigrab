"""
OmniGrab Android — Toga Application
Hosts a full-screen WebView pointing at the FastAPI backend.
"""
import asyncio
import threading
import time
import toga
from toga.style import Pack
from toga.style.pack import COLUMN


SERVER_PORT = 8765
SERVER_READY_TIMEOUT = 15  # seconds


class OmniGrabAndroid(toga.App):
    def startup(self):
        """Called by Briefcase when the app starts."""
        self.main_window = toga.MainWindow(
            title="OmniGrab",
            resizable=False
        )

        # Full-screen WebView — this IS the entire UI
        self.webview = toga.WebView(
            style=Pack(flex=1),
        )

        main_box = toga.Box(
            children=[self.webview],
            style=Pack(direction=COLUMN, flex=1)
        )

        self.main_window.content = main_box
        self.main_window.show()

        # Add background task: start the FastAPI server, then load the UI
        self.add_background_task(self._boot)

    async def _boot(self, widget):
        """Start the FastAPI server in a daemon thread, then load the WebView."""
        from omnigrab_android.server import start_server

        # Start server in a background daemon thread
        server_thread = threading.Thread(
            target=start_server,
            args=(SERVER_PORT,),
            daemon=True,
            name="omnigrab-fastapi"
        )
        server_thread.start()

        # Wait for the server to become healthy (poll every 200ms)
        start = time.monotonic()
        ready = False
        while time.monotonic() - start < SERVER_READY_TIMEOUT:
            try:
                import urllib.request
                urllib.request.urlopen(
                    f"http://127.0.0.1:{SERVER_PORT}/health",
                    timeout=0.5
                )
                ready = True
                break
            except Exception:
                await asyncio.sleep(0.2)

        if ready:
            # Load the SvelteKit UI served by FastAPI
            await self.webview.load_url(f"http://127.0.0.1:{SERVER_PORT}/")
        else:
            # Fallback: show error page inline
            self.webview.set_content(
                "http://localhost",
                """<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0a; color: #f5f5f5; font-family: sans-serif;
           display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; text-align: center; padding: 24px; }
    h2 { color: #6366f1; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div>
    <h2>Starting OmniGrab…</h2>
    <p>The download server is taking longer than expected to start.<br>
       Please close and reopen the app.</p>
  </div>
</body>
</html>"""
            )
