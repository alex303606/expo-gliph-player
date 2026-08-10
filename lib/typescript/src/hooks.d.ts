/**
 * hooks.ts — React hooks for react-native-gliph-player
 */
import { Event } from './types';
import type { Track, Progress, PlaybackState, RepeatMode, EventPayloadByEvent } from './types';
/**
 * Subscribe to one or more player events inside a component.
 * Automatically unsubscribes on unmount.
 *
 * @example
 * useTrackPlayerEvents([Event.PlaybackState], ({ state }) => {
 *   console.log(state);
 * });
 */
export declare function useTrackPlayerEvents<E extends Event>(events: E[], handler: (payload: EventPayloadByEvent[E] & {
    type: E;
}) => void): void;
/**
 * Returns the current playback state, updating reactively.
 */
export declare function usePlaybackState(): PlaybackState;
/**
 * Returns live playback progress (position, duration, buffered).
 * @param updateInterval  How often to poll in ms. Defaults to 1000ms.
 *                        Set to 0 to rely solely on native progress events.
 */
export declare function useProgress(updateInterval?: number): Progress;
/**
 * Returns the currently active track, updating when the track changes.
 */
export declare function useActiveTrack(): Track | null | undefined;
/**
 * Returns the current queue, updating when tracks are added/removed/changed.
 */
export declare function useQueue(): Track[];
/**
 * Returns the current repeat mode and a setter.
 */
export declare function useRepeatMode(): [RepeatMode | null, (mode: RepeatMode) => Promise<void>];
/**
 * Returns the current volume (0–1) and a setter.
 */
export declare function useVolume(): [number, (v: number) => Promise<void>];
/**
 * Convenience hook — returns { playing, bufferingDuringPlay }.
 */
export declare function useIsPlaying(): {
    playing: boolean;
    bufferingDuringPlay: boolean;
};
//# sourceMappingURL=hooks.d.ts.map