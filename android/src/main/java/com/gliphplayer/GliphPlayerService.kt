package com.gliphplayer

import android.util.Log

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.IBinder
import androidx.media3.common.*
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.*
import androidx.core.app.NotificationCompat
import android.content.pm.ServiceInfo
import com.facebook.react.bridge.*
import kotlinx.coroutines.*

/**
 * GliphPlayerService
 *
 * Foreground service that owns the ExoPlayer instance and MediaSession.
 * Survives app backgrounding and handles:
 *   - Audio playback via ExoPlayer (Media3)
 *   - MediaSession for lock screen / notification controls
 *   - Android Auto via MediaLibraryService
 *   - Audio focus management
 *   - Queue management
 */
@UnstableApi
class GliphPlayerService : MediaLibraryService() {

  companion object {
    private const val CHANNEL_ID = "gliph_player_channel"
    private const val NOTIFICATION_ID = 1001
    private const val ACTION_PLAY = "com.gliphplayer.action.PLAY"
    private const val ACTION_PAUSE = "com.gliphplayer.action.PAUSE"
    private const val ACTION_SKIP_NEXT = "com.gliphplayer.action.SKIP_NEXT"
    private const val ACTION_SKIP_PREVIOUS = "com.gliphplayer.action.SKIP_PREVIOUS"
    private const val ACTION_STOP = "com.gliphplayer.action.STOP"
  }

  // ── Binder ──────────────────────────────────────────────────────────────────

  inner class LocalBinder : Binder() {
    fun getService(): GliphPlayerService = this@GliphPlayerService
  }

  private val binder = LocalBinder()

  override fun onBind(intent: Intent?): IBinder? {
    // MediaLibraryService.onBind handles media browser connections.
    // For our local binding from GliphPlayerModule, we return our LocalBinder.
    // We must check the action to distinguish the two callers.
    val action = intent?.action
    if (action == null ||
        action == "com.gliphplayer.BIND_LOCAL" ||
        action == Intent.ACTION_MAIN) {
      return binder
    }
    // Let MediaLibraryService handle MediaBrowser / MediaSession connections
    return super.onBind(intent)
  }

  // ── State ───────────────────────────────────────────────────────────────────

  private lateinit var player: ExoPlayer
  private lateinit var mediaSession: MediaLibrarySession
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  private var eventEmitter: ((String, WritableMap?) -> Unit)? = null
  private var progressJob: Job? = null
  private var options: ReadableMap? = null

  // Internal queue (mirrors ExoPlayer's playlist)
  private val queue = java.util.Collections.synchronizedList(mutableListOf<ReadableMap>())

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private fun getDouble(map: ReadableMap?, key: String, default: Double): Double {
    return if (map?.hasKey(key) == true) map.getDouble(key) else default
  }

  private fun getInt(map: ReadableMap?, key: String, default: Int): Int {
    return if (map?.hasKey(key) == true) map.getInt(key) else default
  }

  private fun getString(map: ReadableMap?, key: String, default: String?): String? {
    return if (map?.hasKey(key) == true) map.getString(key) else default
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  override fun onCreate() {
    super.onCreate()
    // 1. Create high-importance notification channel
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channel = android.app.NotificationChannel(
        CHANNEL_ID,
        "Music Playback",
        android.app.NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Controls for music playback"
        setShowBadge(false)
        setSound(null, null)
      }
      val manager = getSystemService(android.app.NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }

    // 2. Immediate Foregrounding with a safe system icon
    val initialNotification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle("Gliph Player")
      .setContentText("Preparing playback...")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setOngoing(true)
      .build()

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, initialNotification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, initialNotification)
    }

    // 3. Initialize player
    initPlayer()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)
    when (intent?.action) {
      ACTION_PLAY -> play()
      ACTION_PAUSE -> pause()
      ACTION_SKIP_NEXT -> skipToNext(-1.0)
      ACTION_SKIP_PREVIOUS -> skipToPrevious(-1.0)
      ACTION_STOP -> {
        stop()
        stopSelf()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    scope.cancel()
    mediaSession.release()
    player.release()
    super.onDestroy()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession {
    Log.d("GliphPlayer", "onGetSession called from: ${controllerInfo.packageName}")
    return mediaSession
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    val behavior = options?.getMap("android")?.getString("appKilledPlaybackBehavior")
    if (behavior == "StopPlaybackAndRemoveNotification") {
      destroy()
      stopSelf()
    } else if (behavior == "PausePlayback") {
      player.pause()
    }
    super.onTaskRemoved(rootIntent)
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  private fun initPlayer(opts: ReadableMap? = null) {
    // ── Fix #4: Buffer values from JS are in SECONDS (Double).
    // ExoPlayer's DefaultLoadControl expects MILLISECONDS (Long).
    // We convert here so callers never accidentally buffer for 1000 seconds.
    //
    // JS API contract (all values in seconds):
    //   minBuffer    — minimum seconds to buffer before playback starts (default 15s)
    //   maxBuffer    — maximum seconds to buffer ahead (default 50s)
    //   playBuffer   — seconds buffered before playback resumes after stall (default 2.5s)
    //   backBuffer   — seconds of audio to keep behind current position (default 0s)
    val minBufferMs  = (getDouble(opts, "minBuffer", 15.0)  * 1000).toInt()
    val maxBufferMs  = (getDouble(opts, "maxBuffer", 50.0)  * 1000).toInt()
    val playBufferMs = (getDouble(opts, "playBuffer", 2.5)   * 1000).toInt()
    val backBufferMs = (getDouble(opts, "backBuffer", 0.0)   * 1000).toInt()

    val loadControl = androidx.media3.exoplayer.DefaultLoadControl.Builder()
      .setBufferDurationsMs(minBufferMs, maxBufferMs, playBufferMs, playBufferMs)
      .setBackBuffer(backBufferMs, /* retainBackBufferFromKeyframe= */ false)
      .build()

    player = ExoPlayer.Builder(this)
      .setMediaSourceFactory(DefaultMediaSourceFactory(this))
      .setLoadControl(loadControl)
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_NETWORK)
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(C.USAGE_MEDIA)
          .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
          .build(),
        /* handleAudioFocus= */ true
      )
      .build()

    player.addListener(playerListener)

    val sessionActivityIntent = packageManager
      .getLaunchIntentForPackage(packageName)
      ?.let { PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE) }

    mediaSession = MediaLibrarySession.Builder(this, player, mediaSessionCallback)
      .also { builder ->
        sessionActivityIntent?.let { builder.setSessionActivity(it) }
      }
      .build()
  }

  private fun servicePendingIntent(action: String, requestCode: Int): PendingIntent {
    val intent = Intent(this, GliphPlayerService::class.java).apply {
      this.action = action
    }
    return PendingIntent.getService(
      this,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  private fun appPendingIntent(): PendingIntent? {
    return packageManager
      .getLaunchIntentForPackage(packageName)
      ?.let { intent ->
        PendingIntent.getActivity(
          this,
          0,
          intent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
      }
  }

  private fun buildMediaNotification(): Notification {
    val currentMediaItem = player.currentMediaItem
    val metadata = currentMediaItem?.mediaMetadata
    val playPauseIcon = if (player.isPlaying) {
      android.R.drawable.ic_media_pause
    } else {
      android.R.drawable.ic_media_play
    }
    val playPauseTitle = if (player.isPlaying) "Pause" else "Play"
    val playPauseAction = if (player.isPlaying) ACTION_PAUSE else ACTION_PLAY

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(metadata?.title ?: "Gliph Player")
      .setContentText(metadata?.artist ?: "Ready to play")
      .setSubText(metadata?.albumTitle)
      .setContentIntent(appPendingIntent())
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setOngoing(player.isPlaying)
      .addAction(
        android.R.drawable.ic_media_previous,
        "Previous",
        servicePendingIntent(ACTION_SKIP_PREVIOUS, 1)
      )
      .addAction(
        playPauseIcon,
        playPauseTitle,
        servicePendingIntent(playPauseAction, 2)
      )
      .addAction(
        android.R.drawable.ic_media_next,
        "Next",
        servicePendingIntent(ACTION_SKIP_NEXT, 3)
      )
      .setStyle(
        androidx.media.app.NotificationCompat.MediaStyle()
          .setMediaSession(mediaSession.sessionCompatToken)
          .setShowActionsInCompactView(0, 1, 2)
      )
      .build()
  }

  private fun updateMediaNotification() {
    if (!::player.isInitialized || !::mediaSession.isInitialized) {
      return
    }

    val notification = buildMediaNotification()
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, notification)
  }

  fun setEventEmitter(emitter: (String, WritableMap?) -> Unit) {
    eventEmitter = emitter
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  fun setupPlayer(opts: ReadableMap) {
    Log.d("GliphPlayer", "setupPlayer called with opts: $opts")
    options = opts

    // ── Fix #5: Android-specific options (appKilledPlaybackBehavior, audioUsage,
    // audioContentType) are applied HERE at setup time, not in updateOptions.
    // This avoids Codegen type mismatches and ensures the ExoPlayer AudioAttributes
    // are configured before the first track is loaded.
    val androidOpts = if (opts.hasKey("android")) opts.getMap("android") else null
    val audioUsageStr = getString(androidOpts, "audioUsage", null)
    val audioUsage = when (audioUsageStr) {
      "voiceCommunication" -> C.USAGE_VOICE_COMMUNICATION
      "alarm"              -> C.USAGE_ALARM
      "notification"       -> C.USAGE_NOTIFICATION
      "game"               -> C.USAGE_GAME
      else                 -> C.USAGE_MEDIA  // default: music
    }
    val audioContentTypeStr = getString(androidOpts, "audioContentType", null)
    val audioContentType = when (audioContentTypeStr) {
      "speech"       -> C.AUDIO_CONTENT_TYPE_SPEECH
      "sonification" -> C.AUDIO_CONTENT_TYPE_SONIFICATION
      "movie"        -> C.AUDIO_CONTENT_TYPE_MOVIE
      else           -> C.AUDIO_CONTENT_TYPE_MUSIC  // default
    }

    // Re-init player with the correct buffer settings and audio attributes
    if (::player.isInitialized) {
      player.release()
      mediaSession.release()
    }
    initPlayer(opts)

    // Apply audio attributes after init (ExoPlayer allows this before first play)
    player.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(audioUsage)
        .setContentType(audioContentType)
        .build(),
      /* handleAudioFocus= */ true
    )

    startProgressUpdates()
  }

  fun destroy() {
    stopProgressUpdates()
    scope.launch(Dispatchers.Main) {
      if (::player.isInitialized) {
        player.stop()
        player.clearMediaItems()
      }
      synchronized(queue) {
        queue.clear()
      }
    }
  }

  // ── Queue management ────────────────────────────────────────────────────────

  fun add(tracks: ReadableArray, insertBeforeIndex: Int): Int {
    val startIndex = if (insertBeforeIndex < 0 || insertBeforeIndex > queue.size) {
      queue.size
    } else {
      insertBeforeIndex
    }

    val mediaItems = mutableListOf<MediaItem>()
    for (i in 0 until tracks.size()) {
      val track = tracks.getMap(i) ?: continue
      Log.d("GliphPlayer", "Adding track: ${track.getString("title")} (URL: ${track.getString("url")})")
      queue.add(startIndex + (i), track)
      mediaItems.add(buildMediaItem(track))
    }

    if (insertBeforeIndex < 0 || insertBeforeIndex >= player.mediaItemCount) {
      player.addMediaItems(mediaItems)
    } else {
      player.addMediaItems(insertBeforeIndex, mediaItems)
    }

    updateMediaNotification()
    return startIndex
  }

  fun remove(trackIds: ReadableArray) {
    val ids = (0 until trackIds.size()).map { trackIds.getString(it) ?: "" }.toSet()
    val indicesToRemove = queue.indices
      .filter { i -> queue[i].getString("id") in ids }
      .sortedDescending()

    for (i in indicesToRemove) {
      queue.removeAt(i)
      player.removeMediaItem(i)
    }
  }

  fun removeUpcomingTracks() {
    val current = player.currentMediaItemIndex
    val total = player.mediaItemCount
    if (current < total - 1) {
      player.removeMediaItems(current + 1, total)
      while (queue.size > current + 1) {
        queue.removeAt(queue.size - 1)
      }
    }
  }

  fun skip(index: Int, initialPosition: Double) {
    player.seekTo(index, if (initialPosition >= 0) (initialPosition * 1000).toLong() else C.TIME_UNSET)
    player.play()
  }

  fun skipToNext(initialPosition: Double) {
    if (player.hasNextMediaItem()) {
      player.seekToNextMediaItem()
      if (initialPosition >= 0) player.seekTo((initialPosition * 1000).toLong())
      player.play()
    }
  }

  fun skipToPrevious(initialPosition: Double) {
    if (player.hasPreviousMediaItem()) {
      player.seekToPreviousMediaItem()
      if (initialPosition >= 0) player.seekTo((initialPosition * 1000).toLong())
      player.play()
    }
  }

  fun move(fromIndex: Int, toIndex: Int) {
    if (fromIndex < 0 || fromIndex >= queue.size || toIndex < 0 || toIndex >= queue.size) return
    val track = queue.removeAt(fromIndex)
    queue.add(toIndex, track)
    player.moveMediaItem(fromIndex, toIndex)
  }

  // ── Playback control ────────────────────────────────────────────────────────

  fun play() {
    if (player.playbackState == Player.STATE_IDLE) {
      player.prepare()
    }
    player.play()
    updateMediaNotification()
  }

  fun pause() {
    player.pause()
    updateMediaNotification()
  }

  fun stop() {
    player.stop()
    updateMediaNotification()
  }

  fun reset() {
    player.stop()
    player.clearMediaItems()
    queue.clear()
    updateMediaNotification()
  }

  fun seekTo(positionSeconds: Double) {
    player.seekTo((positionSeconds * 1000).toLong())
    val map = Arguments.createMap()
    map.putDouble("position", positionSeconds)
    map.putDouble("duration", if (player.duration == C.TIME_UNSET) 0.0 else player.duration / 1000.0)
    map.putDouble("buffered", player.bufferedPosition / 1000.0)
    map.putInt("track", player.currentMediaItemIndex)
    eventEmitter?.invoke("playback-progress-updated", map)
  }

  fun seekBy(offsetSeconds: Double) {
    val newPos = player.currentPosition + (offsetSeconds * 1000).toLong()
    player.seekTo(newPos.coerceAtLeast(0))
  }

  fun setVolume(volume: Float) {
    player.volume = volume
  }

  fun getVolume(): Float = player.volume

  fun setRate(rate: Float) {
    player.setPlaybackSpeed(rate)
  }

  fun getRate(): Float = player.playbackParameters.speed

  fun setRepeatMode(mode: Int) {
    player.repeatMode = when (mode) {
      1 -> Player.REPEAT_MODE_ONE
      2 -> Player.REPEAT_MODE_ALL
      else -> Player.REPEAT_MODE_OFF
    }
    val map = Arguments.createMap()
    map.putInt("mode", mode)
    eventEmitter?.invoke("playback-repeat-mode-changed", map)
  }

  fun getRepeatMode(): Int = when (player.repeatMode) {
    Player.REPEAT_MODE_ONE -> 1
    Player.REPEAT_MODE_ALL -> 2
    else -> 0
  }

  // ── Queue getters ───────────────────────────────────────────────────────────

  fun getQueue(): WritableArray {
    val arr = Arguments.createArray()
    queue.forEach { track ->
      arr.pushMap(Arguments.makeNativeMap(track.toHashMap()))
    }
    return arr
  }

  fun getActiveTrackIndex(): Int {
    val idx = player.currentMediaItemIndex
    return if (idx >= 0 && idx < queue.size) idx else -1
  }

  fun getActiveTrack(): WritableMap? {
    val idx = getActiveTrackIndex()
    if (idx < 0 || idx >= queue.size) return null
    return Arguments.makeNativeMap(queue[idx].toHashMap())
  }

  fun getTrack(index: Int): WritableMap? {
    if (index < 0 || index >= queue.size) return null
    return Arguments.makeNativeMap(queue[index].toHashMap())
  }

  fun getQueueSize(): Int = queue.size

  // ── State / progress ────────────────────────────────────────────────────────

  fun getPlaybackState(): WritableMap {
    val map = Arguments.createMap()
    map.putString("state", mapPlayerState())
    return map
  }

  fun getProgress(): WritableMap {
    val map = Arguments.createMap()
    map.putDouble("position", player.currentPosition / 1000.0)
    map.putDouble("duration", if (player.duration == C.TIME_UNSET) 0.0 else player.duration / 1000.0)
    map.putDouble("buffered", player.bufferedPosition / 1000.0)
    return map
  }

  private fun mapPlayerState(): String {
    if (player.playerError != null) return "error"
    if (!player.playWhenReady && player.playbackState == Player.STATE_READY) return "paused"
    return when (player.playbackState) {
      Player.STATE_IDLE -> "none"
      Player.STATE_BUFFERING -> if (player.playWhenReady) "buffering" else "loading"
      Player.STATE_READY -> if (player.isPlaying) "playing" else "paused"
      Player.STATE_ENDED -> "ended"
      else -> "none"
    }
  }

  // ── Metadata ────────────────────────────────────────────────────────────────

  fun updateMetadataForTrack(index: Int, metadata: ReadableMap) {
    if (index < 0 || index >= queue.size) return
    val existing = queue[index].toHashMap()
    metadata.toHashMap().forEach { (k, v) -> existing[k] = v }
    // Rebuild the queue entry (ReadableMap is immutable, so we use a WritableMap)
    val updated = Arguments.makeNativeMap(existing)
    queue[index] = updated
    // Update ExoPlayer media item metadata
    player.replaceMediaItem(index, buildMediaItem(updated))
    updateMediaNotification()
  }

  fun clearNowPlayingMetadata() {
    mediaSession.setCustomLayout(emptyList())
  }

  fun updateNowPlayingMetadata(metadata: ReadableMap) {
    val currentIndex = player.currentMediaItemIndex
    if (currentIndex < 0 || currentIndex >= queue.size) return

    val existing = queue[currentIndex].toHashMap()
    metadata.toHashMap().forEach { (k, v) -> existing[k] = v }
    val updated = Arguments.makeNativeMap(existing)
    queue[currentIndex] = updated

    // Update the live MediaItem in the player
    val currentItem = player.currentMediaItem ?: return
    val newMetadata = currentItem.mediaMetadata.buildUpon()
      .also { builder ->
        if (metadata.hasKey("title")) builder.setTitle(metadata.getString("title"))
        if (metadata.hasKey("artist")) builder.setArtist(metadata.getString("artist"))
        if (metadata.hasKey("album")) builder.setAlbumTitle(metadata.getString("album"))
        if (metadata.hasKey("artwork")) builder.setArtworkUri(android.net.Uri.parse(metadata.getString("artwork")))
      }
      .build()

    player.replaceMediaItem(currentIndex, currentItem.buildUpon().setMediaMetadata(newMetadata).build())
    updateMediaNotification()
  }

  fun updateOptions(opts: ReadableMap) {
    // Merge new options with existing ones to avoid wiping out buffer settings
    val merged = Arguments.createMap()
    options?.let { merged.merge(it) }
    merged.merge(opts)
    options = merged

    // Restart progress updates if the interval changed
    if (opts.hasKey("progressUpdateEventInterval")) {
      startProgressUpdates()
    }
  }

  // ── Progress updates ────────────────────────────────────────────────────────

  private fun startProgressUpdates() {
    stopProgressUpdates()
    val interval = (getDouble(options, "progressUpdateEventInterval", 1.0) * 1000).toLong()
    progressJob = scope.launch {
      while (isActive) {
        delay(interval)
        if (player.isPlaying) {
          val map = Arguments.createMap()
          map.putDouble("position", player.currentPosition / 1000.0)
          map.putDouble("duration", if (player.duration == C.TIME_UNSET) 0.0 else player.duration / 1000.0)
          map.putDouble("buffered", player.bufferedPosition / 1000.0)
          map.putInt("track", player.currentMediaItemIndex)
          eventEmitter?.invoke("playback-progress-updated", map)
        }
      }
    }
  }

  private fun stopProgressUpdates() {
    progressJob?.cancel()
    progressJob = null
  }

  // ── MediaItem builder ───────────────────────────────────────────────────────

  private fun buildMediaItem(track: ReadableMap): MediaItem {
    val url = track.getString("url") ?: ""
    val title = track.getString("title") ?: ""
    val artist = track.getString("artist") ?: ""
    val album = track.getString("album") ?: ""
    val artworkUri = track.getString("artwork")

    val metadata = MediaMetadata.Builder()
      .setTitle(title)
      .setArtist(artist)
      .setAlbumTitle(album)
      .also { builder ->
        artworkUri?.takeIf { it.isNotEmpty() }?.let {
          builder.setArtworkUri(android.net.Uri.parse(it))
        }
      }
      .build()

    return MediaItem.Builder()
      .setUri(url)
      .setMediaId(track.getString("id") ?: url)
      .setMediaMetadata(metadata)
      .also { builder ->
        // Custom headers
        val headers = track.getMap("headers")
        if (headers != null) {
          val headersMap = headers.toHashMap().mapValues { it.value.toString() }
          if (headersMap.isNotEmpty()) {
            builder.setRequestMetadata(
              MediaItem.RequestMetadata.Builder()
                .setExtras(android.os.Bundle().apply {
                  headersMap.forEach { (k, v) -> putString(k, v) }
                })
                .build()
            )
          }
        }
      }
      .build()
  }

  // ── Player listener ─────────────────────────────────────────────────────────

  private val playerListener = object : Player.Listener {

    private var lastIndex = -1

    override fun onPlaybackStateChanged(playbackState: Int) {
      emitPlaybackState()
      updateMediaNotification()
      if (playbackState == Player.STATE_ENDED) {
        // Emit track ended for the last item in the queue if it just finished
        val map = Arguments.createMap()
        map.putInt("index", player.currentMediaItemIndex)
        eventEmitter?.invoke("playback-track-ended", map)

        // Then emit queue ended
        val queueMap = Arguments.createMap()
        queueMap.putInt("index", player.currentMediaItemIndex)
        queueMap.putDouble("position", player.currentPosition / 1000.0)
        eventEmitter?.invoke("playback-queue-ended", queueMap)
      }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
      emitPlaybackState()
      updateMediaNotification()
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      // If we transitioned to a new item, the previous one "ended" its playback
      if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO || reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
        val endedMap = Arguments.createMap()
        endedMap.putInt("index", lastIndex)
        eventEmitter?.invoke("playback-track-ended", endedMap)
      }

      val newIndex = player.currentMediaItemIndex
      val map = Arguments.createMap()
      map.putInt("index", newIndex)
      map.putInt("lastIndex", lastIndex)
      map.putDouble("lastPosition", player.currentPosition / 1000.0)

      if (newIndex >= 0 && newIndex < queue.size) {
        map.putMap("track", Arguments.makeNativeMap(queue[newIndex].toHashMap()))
      } else {
        map.putNull("track")
      }

      if (lastIndex >= 0 && lastIndex < queue.size) {
        map.putMap("lastTrack", Arguments.makeNativeMap(queue[lastIndex].toHashMap()))
      } else {
        map.putNull("lastTrack")
      }

      eventEmitter?.invoke("playback-active-track-changed", map)
      lastIndex = newIndex
      updateMediaNotification()
    }

    override fun onPlayerError(error: PlaybackException) {
      val map = Arguments.createMap()
      map.putString("code", "playback_error_${error.errorCode}")
      map.putString("message", error.message ?: "Unknown playback error")
      eventEmitter?.invoke("playback-error", map)
      emitPlaybackState()

      // Optional auto-skip recovery
      val autoSkip = options?.getMap("android")?.let { androidMap ->
          androidMap.hasKey("autoSkipOnError") && androidMap.getBoolean("autoSkipOnError")
      } ?: false
      if (autoSkip && player.hasNextMediaItem()) {
        player.seekToNextMediaItem()
        player.prepare()
        player.play()
      }
    }

    private fun emitPlaybackState() {
      val map = Arguments.createMap()
      map.putString("state", mapPlayerState())
      eventEmitter?.invoke("playback-state", map)
    }
  }

  // ── MediaSession callback ───────────────────────────────────────────────────

  private val mediaSessionCallback = object : MediaLibrarySession.Callback {

    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): com.google.common.util.concurrent.ListenableFuture<MutableList<MediaItem>> {
      // Resolve URIs for Android Auto / external controllers
      val resolved = mediaItems.map { item ->
        item.buildUpon().setUri(item.requestMetadata.mediaUri).build()
      }.toMutableList()
      return com.google.common.util.concurrent.Futures.immediateFuture(resolved)
    }
  }
}
