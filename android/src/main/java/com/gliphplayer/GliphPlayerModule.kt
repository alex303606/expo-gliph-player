package com.gliphplayer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*

/**
 * GliphPlayerModule
 *
 * Works on both New Architecture (TurboModule) and Old Architecture (bridge).
 * - New Arch: NativeGliphPlayerSpec (newarch/) extends TurboModule
 * - Old Arch: NativeGliphPlayerSpec (oldarch/) extends ReactContextBaseJavaModule
 *
 * @ReactMethod annotations are required for Old Arch method exposure.
 * They are harmless on New Arch.
 */
@ReactModule(name = GliphPlayerModule.NAME)
class GliphPlayerModule(
  private val reactContext: ReactApplicationContext
) : NativeGliphPlayerSpec(reactContext) {

  companion object {
    const val NAME = "RNGliphPlayer"
  }

  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
  private var playerService: GliphPlayerService? = null
  private var isBound = false

  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val localBinder = binder as? GliphPlayerService.LocalBinder
      playerService = localBinder?.getService()
      playerService?.setEventEmitter { eventName, data ->
        sendEvent(eventName, data)
      }
      isBound = true
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      playerService = null
      isBound = false
    }
  }

  // ── Event emission ──────────────────────────────────────────────────────────

  private fun sendEvent(eventName: String, data: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, data)
  }

  // ── Fix #2: `override` is required because these methods are declared in the
  // auto-generated NativeGliphPlayerSpec base class. TurboModules are strict —
  // without `override` the Kotlin compiler treats them as new declarations and
  // the spec contract is broken, causing a runtime "method not found" crash.
  @ReactMethod override fun addListener(eventType: String) {}
  @ReactMethod override fun removeListeners(count: Double) {}

  // ── Setup ───────────────────────────────────────────────────────────────────

  @ReactMethod
  override fun setupPlayer(options: ReadableMap, promise: Promise) {
    scope.launch {
      try {
        val intent = Intent(reactContext, GliphPlayerService::class.java).apply {
          action = "com.gliphplayer.BIND_LOCAL"
        }
        reactContext.startForegroundService(intent)
        reactContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)

        // Wait for service to bind (max 5s)
        withContext(Dispatchers.Default) {
          var waited = 0
          while (!isBound && waited < 5000) {
            delay(50)
            waited += 50
          }
        }

        if (!isBound || playerService == null) {
          promise.reject("setup_error", "Failed to bind to GliphPlayerService (Timeout)")
          return@launch
        }

        playerService?.setupPlayer(options)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("setup_error", e.message, e)
      }
    }
  }

  // destroy() is synchronous — no @ReactMethod needed (called from JS without await)
  override fun destroy() {
    playerService?.destroy()
    if (isBound) {
      try { reactContext.unbindService(serviceConnection) } catch (_: Exception) {}
      isBound = false
    }
    val intent = Intent(reactContext, GliphPlayerService::class.java)
    reactContext.stopService(intent)
    scope.cancel()
  }

  @ReactMethod
  override fun isServiceRunning(promise: Promise) {
    promise.resolve(isBound && playerService != null)
  }

  // ── Queue management ────────────────────────────────────────────────────────

  @ReactMethod
  override fun add(tracks: ReadableArray, insertBeforeIndex: Double, promise: Promise) {
    scope.launch {
      try {
        // -1 is the sentinel for "append to end"
        val index = if (insertBeforeIndex < 0 || insertBeforeIndex.isNaN()) -1
                    else insertBeforeIndex.toInt()
        val result = playerService?.add(tracks, index)
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("add_error", e.message, e)
      }
    }
  }

  @ReactMethod
  override fun remove(tracks: ReadableArray, promise: Promise) {
    scope.launch {
      try { playerService?.remove(tracks); promise.resolve(null) }
      catch (e: Exception) { promise.reject("remove_error", e.message, e) }
    }
  }

  @ReactMethod
  override fun removeUpcomingTracks(promise: Promise) {
    scope.launch {
      try { playerService?.removeUpcomingTracks(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("remove_error", e.message, e) }
    }
  }

  @ReactMethod
  override fun skip(index: Double, initialPosition: Double, promise: Promise) {
    scope.launch {
      try {
        playerService?.skip(index.toInt(), if (initialPosition < 0) -1.0 else initialPosition)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("skip_error", e.message, e) }
    }
  }

  @ReactMethod
  override fun skipToNext(initialPosition: Double, promise: Promise) {
    scope.launch {
      try {
        playerService?.skipToNext(if (initialPosition < 0) -1.0 else initialPosition)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("skip_error", e.message, e) }
    }
  }

  @ReactMethod
  override fun skipToPrevious(initialPosition: Double, promise: Promise) {
    scope.launch {
      try {
        playerService?.skipToPrevious(if (initialPosition < 0) -1.0 else initialPosition)
        promise.resolve(null)
      } catch (e: Exception) { promise.reject("skip_error", e.message, e) }
    }
  }

  @ReactMethod
  override fun move(fromIndex: Double, toIndex: Double, promise: Promise) {
    scope.launch {
      try { playerService?.move(fromIndex.toInt(), toIndex.toInt()); promise.resolve(null) }
      catch (e: Exception) { promise.reject("move_error", e.message, e) }
    }
  }

  // ── Playback control ────────────────────────────────────────────────────────

  @ReactMethod override fun play(promise: Promise) {
    scope.launch {
      try { playerService?.play(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("play_error", e.message, e) }
    }
  }

  @ReactMethod override fun pause(promise: Promise) {
    scope.launch {
      try { playerService?.pause(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("pause_error", e.message, e) }
    }
  }

  @ReactMethod override fun stop(promise: Promise) {
    scope.launch {
      try { playerService?.stop(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("stop_error", e.message, e) }
    }
  }

  @ReactMethod override fun reset(promise: Promise) {
    scope.launch {
      try { playerService?.reset(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("reset_error", e.message, e) }
    }
  }

  @ReactMethod override fun seekTo(position: Double, promise: Promise) {
    scope.launch {
      try { playerService?.seekTo(position); promise.resolve(null) }
      catch (e: Exception) { promise.reject("seek_error", e.message, e) }
    }
  }

  @ReactMethod override fun seekBy(offset: Double, promise: Promise) {
    scope.launch {
      try { playerService?.seekBy(offset); promise.resolve(null) }
      catch (e: Exception) { promise.reject("seek_error", e.message, e) }
    }
  }

  @ReactMethod override fun setVolume(volume: Double, promise: Promise) {
    scope.launch {
      try { playerService?.setVolume(volume.toFloat()); promise.resolve(null) }
      catch (e: Exception) { promise.reject("volume_error", e.message, e) }
    }
  }

  @ReactMethod override fun getVolume(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getVolume()?.toDouble() ?: 1.0) }
      catch (e: Exception) { promise.reject("volume_error", e.message, e) }
    }
  }

  @ReactMethod override fun setRate(rate: Double, promise: Promise) {
    scope.launch {
      try { playerService?.setRate(rate.toFloat()); promise.resolve(null) }
      catch (e: Exception) { promise.reject("rate_error", e.message, e) }
    }
  }

  @ReactMethod override fun getRate(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getRate()?.toDouble() ?: 1.0) }
      catch (e: Exception) { promise.reject("rate_error", e.message, e) }
    }
  }

  @ReactMethod override fun setRepeatMode(mode: Double, promise: Promise) {
    scope.launch {
      try { playerService?.setRepeatMode(mode.toInt()); promise.resolve(null) }
      catch (e: Exception) { promise.reject("repeat_error", e.message, e) }
    }
  }

  @ReactMethod override fun getRepeatMode(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getRepeatMode()?.toDouble() ?: 0.0) }
      catch (e: Exception) { promise.reject("repeat_error", e.message, e) }
    }
  }

  // ── Queue getters ───────────────────────────────────────────────────────────

  @ReactMethod override fun getQueue(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getQueue()) }
      catch (e: Exception) { promise.reject("queue_error", e.message, e) }
    }
  }

  @ReactMethod override fun getActiveTrackIndex(promise: Promise) {
    scope.launch {
      // Returns -1 when no active track (Codegen doesn't support nullable number returns)
      try { promise.resolve(playerService?.getActiveTrackIndex()?.toDouble() ?: -1.0) }
      catch (e: Exception) { promise.reject("queue_error", e.message, e) }
    }
  }

  @ReactMethod override fun getActiveTrack(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getActiveTrack()) }
      catch (e: Exception) { promise.reject("queue_error", e.message, e) }
    }
  }

  @ReactMethod override fun getTrack(index: Double, promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getTrack(index.toInt())) }
      catch (e: Exception) { promise.reject("queue_error", e.message, e) }
    }
  }

  @ReactMethod override fun getQueueSize(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getQueueSize()?.toDouble() ?: 0.0) }
      catch (e: Exception) { promise.reject("queue_error", e.message, e) }
    }
  }

  // ── State / progress ────────────────────────────────────────────────────────

  @ReactMethod override fun getPlaybackState(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getPlaybackState()) }
      catch (e: Exception) { promise.reject("state_error", e.message, e) }
    }
  }

  @ReactMethod override fun getProgress(promise: Promise) {
    scope.launch {
      try { promise.resolve(playerService?.getProgress()) }
      catch (e: Exception) { promise.reject("progress_error", e.message, e) }
    }
  }

  // ── Metadata ────────────────────────────────────────────────────────────────

  @ReactMethod override fun updateMetadataForTrack(index: Double, metadata: ReadableMap, promise: Promise) {
    scope.launch {
      try { playerService?.updateMetadataForTrack(index.toInt(), metadata); promise.resolve(null) }
      catch (e: Exception) { promise.reject("metadata_error", e.message, e) }
    }
  }

  @ReactMethod override fun clearNowPlayingMetadata(promise: Promise) {
    scope.launch {
      try { playerService?.clearNowPlayingMetadata(); promise.resolve(null) }
      catch (e: Exception) { promise.reject("metadata_error", e.message, e) }
    }
  }

  @ReactMethod override fun updateNowPlayingMetadata(metadata: ReadableMap, promise: Promise) {
    scope.launch {
      try { playerService?.updateNowPlayingMetadata(metadata); promise.resolve(null) }
      catch (e: Exception) { promise.reject("metadata_error", e.message, e) }
    }
  }

  @ReactMethod override fun updateOptions(options: ReadableMap, promise: Promise) {
    scope.launch {
      try { playerService?.updateOptions(options); promise.resolve(null) }
      catch (e: Exception) { promise.reject("options_error", e.message, e) }
    }
  }

  override fun getName() = NAME
}
