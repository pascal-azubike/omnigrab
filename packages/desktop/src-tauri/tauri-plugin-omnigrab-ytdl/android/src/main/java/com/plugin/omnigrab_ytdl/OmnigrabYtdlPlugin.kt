package com.plugin.omnigrab_ytdl

import android.app.Activity
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLException
import com.yausername.youtubedl_android.YoutubeDLRequest
import com.yausername.ffmpeg.FFmpeg

@InvokeArg
class VideoInfoArgs {
    var url: String = ""
}

@InvokeArg
class DownloadArgs {
    var id: String = ""
    var url: String = ""
    var outputPath: String = ""
    var format: String = ""
    var embedThumbnail: Boolean = false
    var embedMetadata: Boolean = false
}

@TauriPlugin
class OmnigrabYtdlPlugin(private val activity: Activity): Plugin(activity) {
    private val TAG = "OmnigrabYtdl"

    private var isInitialized = false
    private var lastInitError: String? = null

    private synchronized fun ensureInit() {
        if (isInitialized) return
        try {
            YoutubeDL.getInstance().init(activity.application)
            FFmpeg.getInstance().init(activity.application)
            isInitialized = true
            Log.i(TAG, "YoutubeDL and FFmpeg initialized successfully.")
        } catch (e: Exception) {
            lastInitError = e.message ?: e.toString()
            Log.e(TAG, "Failed to initialize YoutubeDL/FFmpeg: $lastInitError", e)
        }
    }

    override fun load(webView: android.webkit.WebView) {
        super.load(webView)
        ensureInit()
    }

    @Command
    fun getVideoInfo(invoke: Invoke) {
        ensureInit()
        val args = invoke.parseArgs(VideoInfoArgs::class.java)
        
        Thread {
            try {
                if (!isInitialized) {
                    invoke.reject("YoutubeDL instance not successfully initialized: $lastInitError")
                    return@Thread
                }
                val request = YoutubeDLRequest(args.url)
                request.addOption("--dump-json")
                request.addOption("--no-playlist")
                
                val response = YoutubeDL.getInstance().execute(request, null, null)
                val stdOut = response.out
                
                val ret = JSObject()
                ret.put("data", stdOut)
                invoke.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "getVideoInfo failed", e)
                invoke.reject(e.message ?: "Unknown error in getVideoInfo")
            }
        }.start()
    }

    @Command
    fun startDownload(invoke: Invoke) {
        ensureInit()
        val args = invoke.parseArgs(DownloadArgs::class.java)
        
        Thread {
            try {
                if (!isInitialized) {
                    invoke.reject("YoutubeDL instance not successfully initialized: $lastInitError")
                    return@Thread
                }
                val request = YoutubeDLRequest(args.url)
                request.addOption("-o", args.outputPath)
                request.addOption("-f", args.format)
                if (args.embedThumbnail) request.addOption("--embed-thumbnail")
                if (args.embedMetadata) request.addOption("--add-metadata")
                
                YoutubeDL.getInstance().execute(request, args.id) { progress, etaInSeconds, speed ->
                    val event = JSObject()
                    event.put("id", args.id)
                    event.put("percent", progress)
                    event.put("speed", speed)
                    event.put("eta", "${etaInSeconds}s")
                    event.put("status", "downloading")
                    
                    trigger("download-progress", event)
                }
                
                val ret = JSObject()
                ret.put("status", "success")
                invoke.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "startDownload failed", e)
                invoke.reject(e.message ?: "Unknown error in startDownload")
            }
        }.start()
    }
}
