/**
 * NativeGliphPlayer.ts
 *
 * TurboModule spec for the New React Native Architecture (Codegen).
 * This file is parsed by Codegen to generate C++/Java/ObjC bridge code.
 * All types must be Codegen-compatible (no unions of complex types, etc.)
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// ─── Codegen-compatible track object ────────────────────────────────────────
export interface TrackObject {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
  genre?: string;
  date?: string;
  description?: string;
  rating?: number;
  isLiveStream?: boolean;
  headers?: Object;
  pitchAlgorithm?: number;
  userAgent?: string;
}

// ─── Player options ──────────────────────────────────────────────────────────
export interface PlayerOptions {
  minBuffer?: number;
  maxBuffer?: number;
  playBuffer?: number;
  backBuffer?: number;
  maxCacheSize?: number;
  iosCategory?: string;
  iosCategoryMode?: string;
  iosCategoryOptions?: ReadonlyArray<string>;
  waitForBuffer?: boolean;
  autoHandleInterruptions?: boolean;
  autoUpdateMetadata?: boolean;
  android?: Object;
  progressUpdateEventInterval?: number;
}

// ─── TurboModule spec ────────────────────────────────────────────────────────
export interface Spec extends TurboModule {
  // Setup / teardown
  setupPlayer(options: Object): Promise<void>;
  destroy(): void;
  isServiceRunning(): Promise<boolean>;

  // Queue management
  // NOTE: Codegen does not support optional number params — use -1 as sentinel for "not provided"
  add(tracks: ReadonlyArray<Object>, insertBeforeIndex: number): Promise<number>;
  remove(tracks: ReadonlyArray<string>): Promise<void>;
  removeUpcomingTracks(): Promise<void>;
  skip(index: number, initialPosition: number): Promise<void>;
  skipToNext(initialPosition: number): Promise<void>;
  skipToPrevious(initialPosition: number): Promise<void>;
  move(fromIndex: number, toIndex: number): Promise<void>;

  // Playback control
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  seekTo(position: number): Promise<void>;
  seekBy(offset: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getVolume(): Promise<number>;
  setRate(rate: number): Promise<void>;
  getRate(): Promise<number>;
  setRepeatMode(mode: number): Promise<void>;
  getRepeatMode(): Promise<number>;

  // Queue getters
  // NOTE: Codegen does not support nullable primitives in return position.
  // getActiveTrackIndex returns -1 when no track is active (sentinel value).
  getQueue(): Promise<ReadonlyArray<Object>>;
  getActiveTrackIndex(): Promise<number>;
  getActiveTrack(): Promise<Object | null>;
  getTrack(index: number): Promise<Object | null>;
  getQueueSize(): Promise<number>;

  // Playback state
  getPlaybackState(): Promise<Object>;
  getProgress(): Promise<Object>;

  // Metadata update
  updateMetadataForTrack(index: number, metadata: Object): Promise<void>;
  clearNowPlayingMetadata(): Promise<void>;
  updateNowPlayingMetadata(metadata: Object): Promise<void>;

  // Capabilities / notification
  updateOptions(options: Object): Promise<void>;

  // Events (emitter support — required for TurboModule event emission)
  addListener(eventType: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.get<Spec>('RNGliphPlayer');
