package com.omnigrab.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var bridge: AndroidBridge

    // SAF folder picker launcher
    private val folderPickerLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { uri ->
        uri?.let { handleFolderSelected(it) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Request storage permissions
        PermissionHelper(this).requestStoragePermissions()

        // Setup WebView
        setupWebView()

        // Start Python FastAPI server as a foreground service
        val serviceIntent = Intent(this, PythonService::class.java)
        startForegroundService(serviceIntent)

        // Wait for server to be ready then load UI
        lifecycleScope.launch {
            waitForServerThenLoad()
        }
    }

    private fun setupWebView() {
        webView = findViewById(R.id.webview)

        // Setup the JavaScript bridge
        bridge = AndroidBridge(this)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            // Allow mixed content for localhost
            mixedContentMode = android.webkit.WebSettings
                .MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Custom user agent so SvelteKit detects Android WebView
        webView.settings.userAgentString =
            "Mozilla/5.0 (Linux; Android) OmniGrabAndroid/1.0"

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                // Keep localhost URLs in WebView
                if (url.startsWith("http://localhost")) return false
                // Open external URLs in system browser
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
                return true
            }
        }
    }

    private suspend fun waitForServerThenLoad() {
        // Poll localhost:8765/health until server is ready
        // Timeout after 30 seconds (150 attempts × 200ms)
        repeat(150) { attempt ->
            try {
                val result = withContext(Dispatchers.IO) {
                    val url = URL("http://localhost:8765/health")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 500
                    conn.readTimeout = 500
                    val code = conn.responseCode
                    conn.disconnect()
                    code == 200
                }
                if (result) {
                    // Server is ready — load the UI
                    webView.loadUrl("http://localhost:8765")
                    return
                }
            } catch (e: Exception) {
                // Server not ready yet — keep polling
            }
            delay(200)
        }
        // Server failed to start — show error
        webView.loadData(
            """
            <html><body style="background:#0a0a0a;color:#fff;
            font-family:sans-serif;padding:40px;text-align:center">
            <h2>OmniGrab</h2>
            <p>Failed to start download engine.</p>
            <p>Please restart the app.</p>
            </body></html>
            """,
            "text/html",
            "UTF-8"
        )
    }

    // Called by AndroidBridge when user requests folder picker
    fun openFolderPicker() {
        folderPickerLauncher.launch(null)
    }

    private fun handleFolderSelected(uri: Uri) {
        // Take persistent permission so app can always write here
        contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        )

        // Convert content:// URI to real POSIX path
        val realPath = convertUriToPath(uri)

        // Send path back to SvelteKit UI via JavaScript
        runOnUiThread {
            webView.evaluateJavascript(
                "window.onFolderSelected && " +
                "window.onFolderSelected('${realPath.replace("'", "\\'")}')",
                null
            )
        }
    }

    private fun convertUriToPath(uri: Uri): String {
        return try {
            val docId = DocumentsContract.getTreeDocumentId(uri)
            val split = docId.split(":")
            val type = split[0]
            val path = if (split.size > 1) split[1] else ""

            when (type) {
                "primary" -> "/storage/emulated/0/$path"
                "home" -> "/storage/emulated/0/$path"
                else -> "/storage/$type/$path"  // SD card
            }
        } catch (e: Exception) {
            // Fallback to default downloads
            "/storage/emulated/0/Download/OmniGrab"
        }
    }

    override fun onBackPressed() {
        // Navigate back in WebView history instead of closing app
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Stop the Python service when app is destroyed
        stopService(Intent(this, PythonService::class.java))
    }
}
