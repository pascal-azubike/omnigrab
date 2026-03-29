package com.omnigrab.android

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.chaquo.python.Python

class PythonService : Service() {

    companion object {
        private const val TAG = "PythonService"
        private const val CHANNEL_ID = "omnigrab_service"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        // Show persistent notification (required for foreground service)
        startForeground(NOTIFICATION_ID, buildNotification())

        // Start Python server in a background thread
        // NEVER call Python from the main thread — it will block UI
        Thread {
            try {
                Log.i(TAG, "Starting Python environment...")

                // Initialize Chaquopy Python
                // PyApplication in AndroidManifest handles Python.start()
                // so we just get the instance here
                val py = Python.getInstance()

                Log.i(TAG, "Python started. Starting FastAPI server...")

                // This call BLOCKS forever (uvicorn runs indefinitely)
                // That is correct behavior for a Service
                py.getModule("server").callAttr("start_server", 8765)

            } catch (e: Exception) {
                Log.e(TAG, "Python server error: ${e.message}", e)
            }
        }.apply {
            isDaemon = true
            name = "PythonServerThread"
            start()
        }

        // START_STICKY: restart service if killed by Android
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "OmniGrab Download Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Keeps OmniGrab download engine running"
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("OmniGrab")
            .setContentText("Download engine running")
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "PythonService destroyed")
    }
}
