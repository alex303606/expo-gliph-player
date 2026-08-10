/**
 * GliphPlayer.ts
 *
 * Main JS/TS API surface. Wraps the TurboModule (NativeGliphPlayer) and
 * provides a clean, typed interface identical in spirit to react-native-track-player.
 */
import type { Track, PlayerOptions, UpdateOptions, Progress, PlaybackState } from './types';
import { RepeatMode, State } from './types';
declare const GliphPlayer: {
    /**
     * Initialize the player. Must be called once before any other method.
     * Safe to call multiple times — subsequent calls are no-ops.
     */
    setupPlayer(options?: PlayerOptions): Promise<void>;
    /**
     * Destroy the player and release all resources.
     */
    destroy(): void;
    /**
     * Returns true if the background service is running (Android).
     */
    isServiceRunning(): Promise<boolean>;
    /**
     * Add one or more tracks to the queue.
     * @param tracks  Single track or array of tracks.
     * @param insertBeforeIndex  Insert position. Defaults to end of queue.
     * @returns The index of the first inserted track.
     */
    add(tracks: Track | Track[], insertBeforeIndex?: number): Promise<number | void>;
    /**
     * Remove tracks by their IDs.
     */
    remove(trackIds: string | string[]): Promise<void>;
    /**
     * Remove all tracks after the current one.
     */
    removeUpcomingTracks(): Promise<void>;
    /**
     * Skip to a specific queue index.
     */
    skip(index: number, initialPosition?: number): Promise<void>;
    /**
     * Skip to the next track.
     */
    skipToNext(initialPosition?: number): Promise<void>;
    /**
     * Skip to the previous track.
     */
    skipToPrevious(initialPosition?: number): Promise<void>;
    /**
     * Move a track from one index to another.
     */
    move(fromIndex: number, toIndex: number): Promise<void>;
    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Stop playback and clear the queue.
     */
    reset(): Promise<void>;
    /**
     * Seek to an absolute position in seconds.
     */
    seekTo(position: number): Promise<void>;
    /**
     * Seek by a relative offset in seconds (positive = forward, negative = back).
     */
    seekBy(offset: number): Promise<void>;
    /**
     * Set volume (0.0 – 1.0).
     */
    setVolume(volume: number): Promise<void>;
    getVolume(): Promise<number>;
    /**
     * Set playback rate (1.0 = normal speed).
     */
    setRate(rate: number): Promise<void>;
    getRate(): Promise<number>;
    setRepeatMode(mode: RepeatMode): Promise<void>;
    getRepeatMode(): Promise<RepeatMode>;
    getQueue(): Promise<Track[]>;
    getActiveTrackIndex(): Promise<number | null>;
    getActiveTrack(): Promise<Track | null>;
    getTrack(index: number): Promise<Track | null>;
    getQueueSize(): Promise<number>;
    getPlaybackState(): Promise<PlaybackState>;
    getProgress(): Promise<Progress>;
    updateMetadataForTrack(index: number, metadata: Partial<Track>): Promise<void>;
    clearNowPlayingMetadata(): Promise<void>;
    updateNowPlayingMetadata(metadata: Partial<Track>): Promise<void>;
    /**
     * Configure notification capabilities, jump intervals, etc.
     */
    updateOptions(options: UpdateOptions): Promise<void>;
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
    addEventListener<E extends string>(event: E, listener: (data: any) => void): () => void;
};
export default GliphPlayer;
export declare function isPlaying(state: State): boolean;
export declare function isPaused(state: State): boolean;
export declare function isBuffering(state: State): boolean;
export declare function isStopped(state: State): boolean;
//# sourceMappingURL=GliphPlayer.d.ts.map