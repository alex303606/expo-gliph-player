/**
 * NativeGliphPlayer.ts
 *
 * TurboModule spec for the New React Native Architecture (Codegen).
 * This file is parsed by Codegen to generate C++/Java/ObjC bridge code.
 * All types must be Codegen-compatible (no unions of complex types, etc.)
 */
import type { TurboModule } from 'react-native';
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
export interface Spec extends TurboModule {
    setupPlayer(options: Object): Promise<void>;
    destroy(): void;
    isServiceRunning(): Promise<boolean>;
    add(tracks: ReadonlyArray<Object>, insertBeforeIndex: number): Promise<number>;
    remove(tracks: ReadonlyArray<string>): Promise<void>;
    removeUpcomingTracks(): Promise<void>;
    skip(index: number, initialPosition: number): Promise<void>;
    skipToNext(initialPosition: number): Promise<void>;
    skipToPrevious(initialPosition: number): Promise<void>;
    move(fromIndex: number, toIndex: number): Promise<void>;
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
    getQueue(): Promise<ReadonlyArray<Object>>;
    getActiveTrackIndex(): Promise<number>;
    getActiveTrack(): Promise<Object | null>;
    getTrack(index: number): Promise<Object | null>;
    getQueueSize(): Promise<number>;
    getPlaybackState(): Promise<Object>;
    getProgress(): Promise<Object>;
    updateMetadataForTrack(index: number, metadata: Object): Promise<void>;
    clearNowPlayingMetadata(): Promise<void>;
    updateNowPlayingMetadata(metadata: Object): Promise<void>;
    updateOptions(options: Object): Promise<void>;
    addListener(eventType: string): void;
    removeListeners(count: number): void;
}
declare const _default: Spec | null;
export default _default;
//# sourceMappingURL=NativeGliphPlayer.d.ts.map