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
import androidx.media3.exoplayer.DefaultLoadControl
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
    val action = intent?.action
    if (action == null ||
        action == "com.gliphplayer.BIND_LOCAL" ||
        action == Intent.ACTION_MAIN) {
      return binder
    }
    return super.onBind(intent)
  }

  // ── State ───────────────────────────────────────────────────────────────────

  private lateinit var player: ExoPlayer
  private lateinit var mediaSession: MediaLibrarySession
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  private var eventEmitter: ((String, WritableMap?) -> Unit)? = null
  private var progressJob: Job? = null
  private var options: ReadableMap? = null

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

    initPlayer()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    super.onStartCommand(intent, flags, startId)
    when (intent?.action) {
      ACTION_PLAY -> play()
      ACTION_PAUSE -> pause()
      ACTION_SKIP_NEXT -> skipToNext(-1.0, true)
      ACTION_SKIP_PREVIOUS -> skipToPrevious(-1.0, true)
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
    val playBufferSec = getDouble(opts, "playBuffer", 2.5)
    val minBufferSec  = getDouble(opts, "minBuffer", 15.0)
    val maxBufferSec  = getDouble(opts, "maxBuffer", 50.0)
    val backBufferSec = getDouble(opts, "backBuffer", 0.0)

    val playBufferMs = (playBufferSec * 1000).toInt()    // 2500ms
    var minBufferMs  = (minBufferSec  * 1000).toInt()    // 15000ms
    val maxBufferMs  = (maxBufferSec  * 1000).toInt()    // 50000ms
    val backBufferMs = (backBufferSec * 1000).toInt()    // 0ms

    if (minBufferMs < playBufferMs) {
        Log.w("GliphPlayer", "minBufferMs ($minBufferMs) < playBufferMs ($playBufferMs), adjusting...")
        minBufferMs = playBufferMs
    }

    val loadControl = DefaultLoadControl.Builder()
        .setBufferDurationsMs(minBufferMs, maxBufferMs, playBufferMs, playBufferMs)
        .setBackBuffer(backBufferMs, false)
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
            true
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

    val androidOpts = if (opts.hasKey("android")) opts.getMap("android") else null
    val audioUsageStr = getString(androidOpts, "audioUsage", null)
    val audioUsage = when (audioUsageStr) {
      "voiceCommunication" -> C.USAGE_VOICE_COMMUNICATION
      "alarm"              -> C.USAGE_ALARM
      "notification"       -> C.USAGE_NOTIFICATION
      "game"               -> C.USAGE_GAME
      else                 -> C.USAGE_MEDIA
    }
    val audioContentTypeStr = getString(androidOpts, "audioContentType", null)
    val audioContentType = when (audioContentTypeStr) {
      "speech"       -> C.AUDIO_CONTENT_TYPE_SPEECH
      "sonification" -> C.AUDIO_CONTENT_TYPE_SONIFICATION
      "movie"        -> C.AUDIO_CONTENT_TYPE_MOVIE
      else           -> C.AUDIO_CONTENT_TYPE_MUSIC
    }

    if (::player.isInitialized) {
      player.release()
      mediaSession.release()
    }
    initPlayer(opts)

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

  // ── 🆕 HELPER: Отправка события об изменении активного трека ──────────────

  private fun emitActiveTrackChanged(lastIndex: Int = -1) {
    val newIndex = player.currentMediaItemIndex
    val map = Arguments.createMap()
    map.putInt("index", newIndex)
    map.putInt("lastIndex", if (lastIndex >= 0) lastIndex else newIndex)
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
  }

  // ── 🆕 HELPER: Отправка состояния ──────────────────────────────────────────

  private fun emitPlaybackState(state: String) {
    val map = Arguments.createMap()
    map.putString("state", state)
    eventEmitter?.invoke("playback-state", map)
  }

  // ── Queue management ────────────────────────────────────────────────────────

  fun add(tracks: ReadableArray, insertBeforeIndex: Int): Int {
    val startIndex = if (insertBeforeIndex < 0 || insertBeforeIndex > queue.size) {
      queue.size
    } else {
      insertBeforeIndex
    }

    val wasEmpty = queue.isEmpty()
    val mediaItems = mutableListOf<MediaItem>()

    for (i in 0 until tracks.size()) {
      val track = tracks.getMap(i) ?: continue
      Log.d("GliphPlayer", "Adding track: ${track.getString("title")} (URL: ${track.getString("url")})")
      queue.add(startIndex + i, track)
      mediaItems.add(buildMediaItem(track))
    }

    if (insertBeforeIndex < 0 || insertBeforeIndex >= player.mediaItemCount) {
      player.addMediaItems(mediaItems)
    } else {
      player.addMediaItems(insertBeforeIndex, mediaItems)
    }

    if (wasEmpty && queue.isNotEmpty()) {
      emitActiveTrackChanged()
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

    fun skip(index: Int, initialPosition: Double, autoPlay: Boolean = true) {
        val lastIndex = player.currentMediaItemIndex

        if (index < 0 || index >= queue.size) {
            Log.e("GliphPlayer", "skip: index $index out of bounds")
            return
        }

        player.seekTo(index, if (initialPosition >= 0) (initialPosition * 1000).toLong() else C.TIME_UNSET)

        if (autoPlay) {
            player.playWhenReady = true

            if (player.playbackState == Player.STATE_IDLE) {
                player.prepare()
            }

            player.play()
            emitPlaybackState("playing")
        }

        emitActiveTrackChanged(lastIndex)
    }

  fun skipToNext(initialPosition: Double, autoPlay: Boolean = true) {
    if (player.hasNextMediaItem()) {
      val lastIndex = player.currentMediaItemIndex
      player.seekToNextMediaItem()
      if (initialPosition >= 0) player.seekTo((initialPosition * 1000).toLong())

      if (autoPlay) {
        player.play()
      }

      emitActiveTrackChanged(lastIndex)
      emitPlaybackState(if (autoPlay) "playing" else "paused")
    }
  }

  fun skipToPrevious(initialPosition: Double, autoPlay: Boolean = true) {
    if (player.hasPreviousMediaItem()) {
      val lastIndex = player.currentMediaItemIndex
      player.seekToPreviousMediaItem()
      if (initialPosition >= 0) player.seekTo((initialPosition * 1000).toLong())

      if (autoPlay) {
        player.play()
      }

      emitActiveTrackChanged(lastIndex)
      emitPlaybackState(if (autoPlay) "playing" else "paused")
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

    emitPlaybackState("playing")

    if (player.currentMediaItemIndex >= 0 && player.currentMediaItemIndex < queue.size) {
      emitActiveTrackChanged()
    }

    updateMediaNotification()
  }

  fun pause() {
    player.pause()

    emitPlaybackState("paused")

    updateMediaNotification()
  }

  fun stop() {
    player.stop()

    emitPlaybackState("stopped")

    updateMediaNotification()
  }

  fun reset() {
    val lastIndex = player.currentMediaItemIndex
    player.stop()
    player.clearMediaItems()
    queue.clear()

    val map = Arguments.createMap()
    map.putInt("index", -1)
    map.putNull("track")
    map.putInt("lastIndex", lastIndex)
    map.putDouble("lastPosition", 0.0)
    eventEmitter?.invoke("playback-active-track-changed", map)

    emitPlaybackState("none")

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
    val updated = Arguments.makeNativeMap(existing)
    queue[index] = updated
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
    val merged = Arguments.createMap()
    options?.let { merged.merge(it) }
    merged.merge(opts)
    options = merged

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
      emitPlaybackState(mapPlayerState())
      updateMediaNotification()

      if (playbackState == Player.STATE_ENDED) {
        val map = Arguments.createMap()
        map.putInt("index", player.currentMediaItemIndex)
        eventEmitter?.invoke("playback-track-ended", map)

        val queueMap = Arguments.createMap()
        queueMap.putInt("index", player.currentMediaItemIndex)
        queueMap.putDouble("position", player.currentPosition / 1000.0)
        eventEmitter?.invoke("playback-queue-ended", queueMap)
      }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
      emitPlaybackState(mapPlayerState())
      updateMediaNotification()
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO ||
          reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT) {
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
      emitPlaybackState("error")

      val autoSkip = options?.getMap("android")?.let { androidMap ->
          androidMap.hasKey("autoSkipOnError") && androidMap.getBoolean("autoSkipOnError")
      } ?: false
      if (autoSkip && player.hasNextMediaItem()) {
        player.seekToNextMediaItem()
        player.prepare()
        player.play()
      }
    }
  }

  // ── MediaSession callback ───────────────────────────────────────────────────

  private val mediaSessionCallback = object : MediaLibrarySession.Callback {

    override fun onAddMediaItems(
      mediaSession: MediaSession,
      controller: MediaSession.ControllerInfo,
      mediaItems: MutableList<MediaItem>
    ): com.google.common.util.concurrent.ListenableFuture<MutableList<MediaItem>> {
      val resolved = mediaItems.map { item ->
        item.buildUpon().setUri(item.requestMetadata.mediaUri).build()
      }.toMutableList()
      return com.google.common.util.concurrent.Futures.immediateFuture(resolved)
    }
  }
}