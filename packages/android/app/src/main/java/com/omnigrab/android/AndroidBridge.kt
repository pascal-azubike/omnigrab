package com.omnigrab.android

import android.webkit.JavascriptInterface
import android.os.Environment

class AndroidBridge(private val activity: MainActivity) {

    // Called from SvelteKit to open native folder picker
    @JavascriptInterface
    fun openFolderPicker() {
        activity.runOnUiThread {
            activity.openFolderPicker()
        }
    }

    // Called from SvelteKit to get default download directory
    @JavascriptInterface
    fun getDefaultDownloadDir(): String {
        val dir = android.os.Environment.getExternalStoragePublicDirectory(
            android.os.Environment.DIRECTORY_DOWNLOADS
        )
        val omnigrabDir = java.io.File(dir, "OmniGrab")
        omnigrabDir.mkdirs()
        return omnigrabDir.absolutePath
    }

    // Called from SvelteKit to check if running on Android
    @JavascriptInterface
    fun isAndroid(): Boolean = true

    // Called from SvelteKit to open file manager at path
    @JavascriptInterface
    fun openFileManager(path: String) {
        activity.runOnUiThread {
            try {
                val intent = android.content.Intent(
                    android.content.Intent.ACTION_VIEW
                )
                intent.setDataAndType(
                    android.net.Uri.parse("file://$path"),
                    "resource/folder"
                )
                activity.startActivity(intent)
            } catch (e: Exception) {
                // File manager doesn't support folder intent
                // Open Downloads instead
                val intent = android.content.Intent(
                    android.content.Intent.ACTION_VIEW
                )
                intent.setDataAndType(
                    android.net.Uri.parse(
                        "file://${Environment
                        .getExternalStoragePublicDirectory(
                            Environment.DIRECTORY_DOWNLOADS
                        ).absolutePath}"
                    ),
                    "resource/folder"
                )
                try { activity.startActivity(intent) } catch (_: Exception) {}
            }
        }
    }

    // Called from SvelteKit to show Android toast message
    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            android.widget.Toast.makeText(
                activity,
                message,
                android.widget.Toast.LENGTH_SHORT
            ).show()
        }
    }

    // Called from SvelteKit to get app version
    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            activity.packageManager
                .getPackageInfo(activity.packageName, 0)
                .versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }
}
