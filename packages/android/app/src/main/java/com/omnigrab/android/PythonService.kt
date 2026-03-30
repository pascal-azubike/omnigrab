package com.omnigrab.android

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import com.chaquo.python.Python

class PythonService : Service() {

    private lateinit var wakeLock: PowerManager.WakeLock

    companion object {
        private const val TAG = "PythonService"
        private const val CHANNEL_ID = "omnigrab_service"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "OmniGrab::DownloadWakeLock"
        )
        wakeLock.acquire(60 * 60 * 1000L) // 1 hour max
        createNotificationChannel()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        // Show persistent notification (required for foreground service)
        if (android.os.Build.VERSION.SDK_INT >= 34) { // UPSIDE_DOWN_CAKE
            startForeground(
                NOTIFICATION_ID, 
                buildNotification(), 
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }

        // Start Python server in a background thread
        // NEVER call Python from the main thread — it will block UI
        Thread {
            try {
                Log.i(TAG, "Starting Python server...")

                // Read ffmpeg path passed from MainActivity
                val ffmpegPath = intent?.getStringExtra("ffmpeg_path") ?: ""
                Log.i(TAG, "ffmpeg_path received: $ffmpegPath")

                val py = Python.getInstance()
                val server = py.getModule("server")

                // Pass ffmpeg path to Python BEFORE starting server
                // This sets the global _ffmpeg_path variable in server.py
                if (ffmpegPath.isNotEmpty()) {
                    server.callAttr("set_ffmpeg_path", ffmpegPath)
                    Log.i(TAG, "ffmpeg path set in Python: $ffmpegPath")
                } else {
                    Log.w(TAG, "No ffmpeg path — downloads limited to pre-merged formats")
                }

                // Start the FastAPI server — this blocks forever
                server.callAttr("start_server", 8765)

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
            .setSmallIcon(android.R.drawable.ic_menu_save)
            .setOngoing(true)
            .setPriority(Notification.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        if (::wakeLock.isInitialized && wakeLock.isHeld) {
            wakeLock.release()
        }
        super.onDestroy()
        Log.i(TAG, "PythonService destroyed")
    }
}
