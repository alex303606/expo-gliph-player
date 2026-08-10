/**
 * GliphPlayer.ts
 *
 * Main JS/TS API surface. Wraps the TurboModule (NativeGliphPlayer) and
 * provides a clean, typed interface identical in spirit to react-native-track-player.
 */

import { NativeEventEmitter, Platform } from 'react-native';
import NativeGliphPlayer from './specs/NativeGliphPlayer';
import type {
  Track,
  PlayerOptions,
  UpdateOptions,
  Progress,
  PlaybackState,
} from './types';
import { RepeatMode, State } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!NativeGliphPlayer) {
    throw new Error('[RNGliphPlayer] Native module not found. Is it linked correctly?');
  }
  if (!_emitter) {
    _emitter = new NativeEventEmitter(NativeGliphPlayer as any);
  }
  return _emitter;
}

/** Resolve a require()'d asset to a URI string the native side can consume */
function resolveAssetSource(source: string | number): string {
  if (typeof source === 'number') {

    const { Image } = require('react-native');
    return Image.resolveAssetSource(source).uri as string;
  }
  return source;
}

/** Serialize a Track to a plain object safe for the TurboModule bridge */
function serializeTrack(track: Track): Record<string, unknown> {
  return {
    id: track.id ?? `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    url: resolveAssetSource(track.url as string | number),
    title: track.title,
    artist: track.artist,
    album: track.album ?? '',
    artwork: track.artwork != null ? resolveAssetSource(track.artwork as string | number) : '',
    duration: track.duration ?? -1,
    genre: track.genre ?? '',
    date: track.date ?? '',
    description: track.description ?? '',
    rating: track.rating ?? 0,
    isLiveStream: track.isLiveStream ?? false,
    headers: track.headers ?? {},
    pitchAlgorithm: track.pitchAlgorithm ?? 0,
    userAgent: track.userAgent ?? '',
  };
}

function checkModule(): NonNullable<typeof NativeGliphPlayer> {
  if (!NativeGliphPlayer) {
    throw new Error(
      '[RNGliphPlayer] Native module not found. ' +
      'Ensure you have rebuilt the app after installing the library and ' +
      'that you are not calling player methods before the JSI bridge is ready.'
    );
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
  async setupPlayer(options: PlayerOptions = {}): Promise<void> {
    if (!NativeGliphPlayer) {
      throw new Error('[RNGliphPlayer] Native module not ready. Ensure setup is called after app initialization.');
    }
    const opts: Record<string, unknown> = {
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
      android: options.android ?? {},
    };
    return NativeGliphPlayer.setupPlayer(opts);
  },

  /**
   * Destroy the player and release all resources.
   */
  destroy(): void {
    checkModule().destroy();
    _emitter = null;
  },

  /**
   * Returns true if the background service is running (Android).
   */
  async isServiceRunning(): Promise<boolean> {
    if (Platform.OS !== 'android') {return true;}
    return checkModule().isServiceRunning();
  },

  // ── Queue management ───────────────────────────────────────────────────────

  /**
   * Add one or more tracks to the queue.
   * @param tracks  Single track or array of tracks.
   * @param insertBeforeIndex  Insert position. Defaults to end of queue.
   * @returns The index of the first inserted track.
   */
  async add(
    tracks: Track | Track[],
    insertBeforeIndex?: number
  ): Promise<number | void> {
    const arr = Array.isArray(tracks) ? tracks : [tracks];
    const serialized = arr.map(serializeTrack);
    // Pass -1 as sentinel for "append to end" — Codegen doesn't support optional number params
    const result = await checkModule().add(serialized, insertBeforeIndex ?? -1);
    return result;
  },

  /**
   * Remove tracks by their IDs.
   */
  async remove(trackIds: string | string[]): Promise<void> {
    const ids = Array.isArray(trackIds) ? trackIds : [trackIds];
    return checkModule().remove(ids);
  },

  /**
   * Remove all tracks after the current one.
   */
  async removeUpcomingTracks(): Promise<void> {
    return checkModule().removeUpcomingTracks();
  },

  /**
   * Skip to a specific queue index.
   */
  async skip(index: number, initialPosition?: number): Promise<void> {
    return checkModule().skip(index, initialPosition ?? -1);
  },

  /**
   * Skip to the next track.
   */
  async skipToNext(initialPosition?: number): Promise<void> {
    return checkModule().skipToNext(initialPosition ?? -1);
  },

  /**
   * Skip to the previous track.
   */
  async skipToPrevious(initialPosition?: number): Promise<void> {
    return checkModule().skipToPrevious(initialPosition ?? -1);
  },

  /**
   * Move a track from one index to another.
   */
  async move(fromIndex: number, toIndex: number): Promise<void> {
    return checkModule().move(fromIndex, toIndex);
  },

  // ── Playback control ───────────────────────────────────────────────────────

  async play(): Promise<void> {
    return checkModule().play();
  },

  async pause(): Promise<void> {
    return checkModule().pause();
  },

  async stop(): Promise<void> {
    return checkModule().stop();
  },

  /**
   * Stop playback and clear the queue.
   */
  async reset(): Promise<void> {
    return checkModule().reset();
  },

  /**
   * Seek to an absolute position in seconds.
   */
  async seekTo(position: number): Promise<void> {
    return checkModule().seekTo(position);
  },

  /**
   * Seek by a relative offset in seconds (positive = forward, negative = back).
   */
  async seekBy(offset: number): Promise<void> {
    return checkModule().seekBy(offset);
  },

  /**
   * Set volume (0.0 – 1.0).
   */
  async setVolume(volume: number): Promise<void> {
    if (volume < 0 || volume > 1) {throw new Error('Volume must be between 0 and 1');}
    return checkModule().setVolume(volume);
  },

  async getVolume(): Promise<number> {
    return checkModule().getVolume();
  },

  /**
   * Set playback rate (1.0 = normal speed).
   */
  async setRate(rate: number): Promise<void> {
    return checkModule().setRate(rate);
  },

  async getRate(): Promise<number> {
    return checkModule().getRate();
  },

  async setRepeatMode(mode: RepeatMode): Promise<void> {
    return checkModule().setRepeatMode(mode);
  },

  async getRepeatMode(): Promise<RepeatMode> {
    const mode = await checkModule().getRepeatMode();
    return mode as RepeatMode;
  },

  // ── Queue getters ──────────────────────────────────────────────────────────

  async getQueue(): Promise<Track[]> {
    const queue = await checkModule().getQueue();
    return queue as Track[];
  },

  async getActiveTrackIndex(): Promise<number | null> {
    const idx = await checkModule().getActiveTrackIndex();
    // Native returns -1 as sentinel when no track is active
    return (idx as number) < 0 ? null : (idx as number);
  },

  async getActiveTrack(): Promise<Track | null> {
    const track = await checkModule().getActiveTrack();
    return track as Track | null;
  },

  async getTrack(index: number): Promise<Track | null> {
    const track = await checkModule().getTrack(index);
    return track as Track | null;
  },

  async getQueueSize(): Promise<number> {
    return checkModule().getQueueSize();
  },

  // ── State / progress ───────────────────────────────────────────────────────

  async getPlaybackState(): Promise<PlaybackState> {
    const state = await checkModule().getPlaybackState();
    return state as PlaybackState;
  },

  async getProgress(): Promise<Progress> {
    const progress = await checkModule().getProgress();
    return progress as Progress;
  },

  // ── Metadata ───────────────────────────────────────────────────────────────

  async updateMetadataForTrack(
    index: number,
    metadata: Partial<Track>
  ): Promise<void> {
    return checkModule().updateMetadataForTrack(index, metadata as Record<string, unknown>);
  },

  async clearNowPlayingMetadata(): Promise<void> {
    return checkModule().clearNowPlayingMetadata();
  },

  async updateNowPlayingMetadata(metadata: Partial<Track>): Promise<void> {
    return checkModule().updateNowPlayingMetadata(metadata as Record<string, unknown>);
  },

  // ── Options / notification ─────────────────────────────────────────────────

  /**
   * Configure notification capabilities, jump intervals, etc.
   */
  async updateOptions(options: UpdateOptions): Promise<void> {
    return checkModule().updateOptions(options as Record<string, unknown>);
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
  addEventListener<E extends string>(
    event: E,
    listener: (data: any) => void
  ): () => void {
    const subscription = getEmitter().addListener(event, listener);
    return () => subscription.remove();
  },
};

export default GliphPlayer;

// ─── Convenience state helpers ────────────────────────────────────────────────

export function isPlaying(state: State): boolean {
  return state === State.Playing;
}

export function isPaused(state: State): boolean {
  return state === State.Paused;
}

export function isBuffering(state: State): boolean {
  return state === State.Buffering || state === State.Loading;
}

export function isStopped(state: State): boolean {
  return state === State.Stopped || state === State.None;
}
