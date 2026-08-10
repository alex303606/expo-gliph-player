package com.gliphplayer

import com.facebook.react.bridge.*

/**
 * NativeGliphPlayerSpec — Old Architecture fallback.
 *
 * When newArchEnabled=false, this base class is used instead of the
 * TurboModule version in src/newarch. It extends ReactContextBaseJavaModule
 * without implementing TurboModule, so it works on the legacy bridge.
 */
abstract class NativeGliphPlayerSpec(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  abstract fun setupPlayer(options: ReadableMap, promise: Promise)
  abstract fun destroy()
  abstract fun isServiceRunning(promise: Promise)

  abstract fun add(tracks: ReadableArray, insertBeforeIndex: Double, promise: Promise)
  abstract fun remove(tracks: ReadableArray, promise: Promise)
  abstract fun removeUpcomingTracks(promise: Promise)
  abstract fun skip(index: Double, initialPosition: Double, promise: Promise)
  abstract fun skipToNext(initialPosition: Double, promise: Promise)
  abstract fun skipToPrevious(initialPosition: Double, promise: Promise)
  abstract fun move(fromIndex: Double, toIndex: Double, promise: Promise)

  abstract fun play(promise: Promise)
  abstract fun pause(promise: Promise)
  abstract fun stop(promise: Promise)
  abstract fun reset(promise: Promise)
  abstract fun seekTo(position: Double, promise: Promise)
  abstract fun seekBy(offset: Double, promise: Promise)
  abstract fun setVolume(volume: Double, promise: Promise)
  abstract fun getVolume(promise: Promise)
  abstract fun setRate(rate: Double, promise: Promise)
  abstract fun getRate(promise: Promise)
  abstract fun setRepeatMode(mode: Double, promise: Promise)
  abstract fun getRepeatMode(promise: Promise)

  abstract fun getQueue(promise: Promise)
  abstract fun getActiveTrackIndex(promise: Promise)
  abstract fun getActiveTrack(promise: Promise)
  abstract fun getTrack(index: Double, promise: Promise)
  abstract fun getQueueSize(promise: Promise)

  abstract fun getPlaybackState(promise: Promise)
  abstract fun getProgress(promise: Promise)

  abstract fun updateMetadataForTrack(index: Double, metadata: ReadableMap, promise: Promise)
  abstract fun clearNowPlayingMetadata(promise: Promise)
  abstract fun updateNowPlayingMetadata(metadata: ReadableMap, promise: Promise)
  abstract fun updateOptions(options: ReadableMap, promise: Promise)

  abstract fun addListener(eventType: String)
  abstract fun removeListeners(count: Double)
}
