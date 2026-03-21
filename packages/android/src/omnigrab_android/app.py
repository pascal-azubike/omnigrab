import toga
import threading
import uvicorn
from omnigrab_android.server import app as fastapi_app

class OmniGrab(toga.App):
    def startup(self):
        # Start FastAPI in a background thread
        self.server_thread = threading.Thread(target=self.run_server, daemon=True)
        self.server_thread.start()

        # Main Layout
        self.main_window = toga.MainWindow(title=self.formal_name)
        
        # WebView pointing to local FastAPI server
        self.webview = toga.WebView(
            style=toga.style.pack(flex=1),
            url="http://127.0.0.1:8765",
            user_agent="OmniGrabAndroid"
        )
        
        self.main_window.content = self.webview
        self.main_window.show()

    def run_server(self):
        uvicorn.run(fastapi_app, host="127.0.0.1", port=8765, log_level="info")

def main():
    return OmniGrab()
