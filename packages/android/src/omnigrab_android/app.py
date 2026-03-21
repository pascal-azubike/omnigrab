"""
OmniGrab Android — BeeWare Briefcase Application Entry Point
"""
import asyncio
import threading
import toga
from toga.style import Pack
from toga.style.pack import COLUMN

SERVER_PORT = 8765


class OmniGrabAndroid(toga.App):
    def startup(self):
        self.main_window = toga.MainWindow(
            title="OmniGrab",
        )
        # Clear toolbar to ensure no native Android action bar shows up
        self.main_window.toolbar.clear()

        # Full-screen WebView — this IS the entire UI
        self.webview = toga.WebView(
            style=Pack(flex=1),
        )

        main_box = toga.Box(
            children=[self.webview],
            style=Pack(direction=COLUMN, flex=1),
        )

        self.main_window.content = main_box
        self.main_window.show()

        # Start FastAPI server in background thread, then load WebView once ready
        self.add_background_task(self._start_server_then_load)

    async def _start_server_then_load(self, widget):
        """Start the FastAPI server then point WebView at it."""
        import threading
        from omnigrab_android.server import start_server

        server_thread = threading.Thread(
            target=start_server,
            args=(SERVER_PORT,),
            daemon=True,
        )
        server_thread.start()

        # Poll /health until the server is ready (max 10 seconds)
        import httpx
        for attempt in range(100):
            try:
                async with httpx.AsyncClient() as client:
                    r = await client.get(
                        f"http://127.0.0.1:{SERVER_PORT}/health",
                        timeout=0.5,
                    )
                    if r.status_code == 200:
                        break
            except Exception:
                pass
            await asyncio.sleep(0.1)

        # Set custom user-agent in JavaScript so the SvelteKit UI can detect Android
        try:
            await self.webview.evaluate_javascript(
                "Object.defineProperty(navigator, 'userAgent', "
                "{get: function() { return navigator.userAgent + ' OmniGrabAndroid/2.0'; }});"
            )
        except Exception:
            pass

        # Load the SvelteKit UI served by FastAPI
        await self.webview.load_url(f"http://127.0.0.1:{SERVER_PORT}/")


def main():
    return OmniGrabAndroid(
        "OmniGrab",
        "com.omnigrab.omnigrab_android",
    )
