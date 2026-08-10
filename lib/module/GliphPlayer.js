"use strict";

/**
 * GliphPlayer.ts
 *
 * Main JS/TS API surface. Wraps the TurboModule (NativeGliphPlayer) and
 * provides a clean, typed interface identical in spirit to react-native-track-player.
 */

import { NativeEventEmitter, Platform } from 'react-native';
import NativeGliphPlayer from './specs/NativeGliphPlayer';
import { State } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _emitter = null;
function getEmitter() {
  if (!NativeGliphPlayer) {
    throw new Error('[RNGliphPlayer] Native module not found. Is it linked correctly?');
  }
  if (!_emitter) {
    _emitter = new NativeEventEmitter(NativeGliphPlayer);
  }
  return _emitter;
}

/** Resolve a require()'d asset to a URI string the native side can consume */
function resolveAssetSource(source) {
  if (typeof source === 'number') {
    const {
      Image
    } = require('react-native');
    return Image.resolveAssetSource(source).uri;
  }
  return source;
}

/** Serialize a Track to a plain object safe for the TurboModule bridge */
function serializeTrack(track) {
  return {
    id: track.id ?? `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    url: resolveAssetSource(track.url),
    title: track.title,
    artist: track.artist,
    album: track.album ?? '',
    artwork: track.artwork != null ? resolveAssetSource(track.artwork) : '',
    duration: track.duration ?? -1,
    genre: track.genre ?? '',
    date: track.date ?? '',
    description: track.description ?? '',
    rating: track.rating ?? 0,
    isLiveStream: track.isLiveStream ?? false,
    headers: track.headers ?? {},
    pitchAlgorithm: track.pitchAlgorithm ?? 0,
    userAgent: track.userAgent ?? ''
  };
}
function checkModule() {
  if (!NativeGliphPlayer) {
    throw new Error('[RNGliphPlayer] Native module not found. ' + 'Ensure you have rebuilt the app after installing the library and ' + 'that you are not calling player methods before the JSI bridge is ready.');
  }
  return NativeGliphPlayer;
}

// ─── GliphPlayer API ─────────────────────────────────────────────────────────

const GliphPlayer = {
  // ── Setup ──────────────────────────────────────────────────────────────────

  /**
   * Initialize the player. Must be called once before any other method.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async setupPlayer(options = {}) {
    if (!NativeGliphPlayer) {
      throw new Error('[RNGliphPlayer] Native module not ready. Ensure setup is called after app initialization.');
    }
    const opts = {
      minBuffer: options.minBuffer ?? 15,
      maxBuffer: options.maxBuffer ?? 50,
      playBuffer: options.playBuffer ?? 2.5,
      backBuffer: options.backBuffer ?? 0,
      maxCacheSize: options.maxCacheSize ?? 0,
      iosCategory: options.iosCategory ?? 'playback',
      iosCategoryMode: options.iosCategoryMode ?? 'default',
      iosCategoryOptions: options.iosCategoryOptions ?? [],
      waitForBuffer: options.waitForBuffer ?? true,
      autoHandleInterruptions: options.autoHandleInterruptions ?? false,
      autoUpdateMetadata: options.autoUpdateMetadata ?? true,
      progressUpdateEventInterval: options.progressUpdateEventInterval ?? 1.0,
      android: options.android ?? {}
    };
    return NativeGliphPlayer.setupPlayer(opts);
  },
  /**
   * Destroy the player and release all resources.
   */
  destroy() {
    checkModule().destroy();
    _emitter = null;
  },
  /**
   * Returns true if the background service is running (Android).
   */
  async isServiceRunning() {
    if (Platform.OS !== 'android') {
      return true;
    }
    return checkModule().isServiceRunning();
  },
  // ── Queue management ───────────────────────────────────────────────────────

  /**
   * Add one or more tracks to the queue.
   * @param tracks  Single track or array of tracks.
   * @param insertBeforeIndex  Insert position. Defaults to end of queue.
   * @returns The index of the first inserted track.
   */
  async add(tracks, insertBeforeIndex) {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    const serialized = arr.map(serializeTrack);
    // Pass -1 as sentinel for "append to end" — Codegen doesn't support optional number params
    const result = await checkModule().add(serialized, insertBeforeIndex ?? -1);
    return result;
  },
  /**
   * Remove tracks by their IDs.
   */
  async remove(trackIds) {
    const ids = Array.isArray(trackIds) ? trackIds : [trackIds];
    return checkModule().remove(ids);
  },
  /**
   * Remove all tracks after the current one.
   */
  async removeUpcomingTracks() {
    return checkModule().removeUpcomingTracks();
  },
  /**
   * Skip to a specific queue index.
   */
  async skip(index, initialPosition) {
    return checkModule().skip(index, initialPosition ?? -1);
  },
  /**
   * Skip to the next track.
   */
  async skipToNext(initialPosition) {
    return checkModule().skipToNext(initialPosition ?? -1);
  },
  /**
   * Skip to the previous track.
   */
  async skipToPrevious(initialPosition) {
    return checkModule().skipToPrevious(initialPosition ?? -1);
  },
  /**
   * Move a track from one index to another.
   */
  async move(fromIndex, toIndex) {
    return checkModule().move(fromIndex, toIndex);
  },
  // ── Playback control ───────────────────────────────────────────────────────

  async play() {
    return checkModule().play();
  },
  async pause() {
    return checkModule().pause();
  },
  async stop() {
    return checkModule().stop();
  },
  /**
   * Stop playback and clear the queue.
   */
  async reset() {
    return checkModule().reset();
  },
  /**
   * Seek to an absolute position in seconds.
   */
  async seekTo(position) {
    return checkModule().seekTo(position);
  },
  /**
   * Seek by a relative offset in seconds (positive = forward, negative = back).
   */
  async seekBy(offset) {
    return checkModule().seekBy(offset);
  },
  /**
   * Set volume (0.0 – 1.0).
   */
  async setVolume(volume) {
    if (volume < 0 || volume > 1) {
      throw new Error('Volume must be between 0 and 1');
    }
    return checkModule().setVolume(volume);
  },
  async getVolume() {
    return checkModule().getVolume();
  },
  /**
   * Set playback rate (1.0 = normal speed).
   */
  async setRate(rate) {
    return checkModule().setRate(rate);
  },
  async getRate() {
    return checkModule().getRate();
  },
  async setRepeatMode(mode) {
    return checkModule().setRepeatMode(mode);
  },
  async getRepeatMode() {
    const mode = await checkModule().getRepeatMode();
    return mode;
  },
  // ── Queue getters ──────────────────────────────────────────────────────────

  async getQueue() {
    const queue = await checkModule().getQueue();
    return queue;
  },
  async getActiveTrackIndex() {
    const idx = await checkModule().getActiveTrackIndex();
    // Native returns -1 as sentinel when no track is active
    return idx < 0 ? null : idx;
  },
  async getActiveTrack() {
    const track = await checkModule().getActiveTrack();
    return track;
  },
  async getTrack(index) {
    const track = await checkModule().getTrack(index);
    return track;
  },
  async getQueueSize() {
    return checkModule().getQueueSize();
  },
  // ── State / progress ───────────────────────────────────────────────────────

  async getPlaybackState() {
    const state = await checkModule().getPlaybackState();
    return state;
  },
  async getProgress() {
    const progress = await checkModule().getProgress();
    return progress;
  },
  // ── Metadata ───────────────────────────────────────────────────────────────

  async updateMetadataForTrack(index, metadata) {
    return checkModule().updateMetadataForTrack(index, metadata);
  },
  async clearNowPlayingMetadata() {
    return checkModule().clearNowPlayingMetadata();
  },
  async updateNowPlayingMetadata(metadata) {
    return checkModule().updateNowPlayingMetadata(metadata);
  },
  // ── Options / notification ─────────────────────────────────────────────────

  /**
   * Configure notification capabilities, jump intervals, etc.
   */
  async updateOptions(options) {
    return checkModule().updateOptions(options);
  },
  // ── Event subscription ─────────────────────────────────────────────────────

  /**
   * Subscribe to a player event.
   * Returns an unsubscribe function — call it to remove the listener.
   *
   * @example
   * const unsub = GliphPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
   *   console.log('State:', state);
   * });
   * // later:
   * unsub();
   */
  addEventListener(event, listener) {
    const subscription = getEmitter().addListener(event, listener);
    return () => subscription.remove();
  }
};
export default GliphPlayer;

// ─── Convenience state helpers ────────────────────────────────────────────────

export function isPlaying(state) {
  return state === State.Playing;
}
export function isPaused(state) {
  return state === State.Paused;
}
export function isBuffering(state) {
  return state === State.Buffering || state === State.Loading;
}
export function isStopped(state) {
  return state === State.Stopped || state === State.None;
}
//# sourceMappingURL=GliphPlayer.js.map