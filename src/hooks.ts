/**
 * hooks.ts — React hooks for react-native-gliph-player
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import GliphPlayer from './GliphPlayer';
import { Event, State } from './types';
import type {
  Track,
  Progress,
  PlaybackState,
  RepeatMode,
  EventPayloadByEvent,
} from './types';

// ─── useTrackPlayerEvents ─────────────────────────────────────────────────────

/**
 * Subscribe to one or more player events inside a component.
 * Automatically unsubscribes on unmount.
 *
 * @example
 * useTrackPlayerEvents([Event.PlaybackState], ({ state }) => {
 *   console.log(state);
 * });
 */
export function useTrackPlayerEvents<E extends Event>(
  events: E[],
  handler: (payload: EventPayloadByEvent[E] & { type: E }) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubs = events.map((event) =>
      GliphPlayer.addEventListener(event, (data: any) => {
        handlerRef.current({ ...data, type: event });
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, events);
}

// ─── usePlaybackState ─────────────────────────────────────────────────────────

/**
 * Returns the current playback state, updating reactively.
 */
export function usePlaybackState(): PlaybackState {
  const [state, setState] = useState<PlaybackState>({ state: State.None });

  useEffect(() => {
    let mounted = true;

    // Fetch initial state
    GliphPlayer.getPlaybackState()
      .then((s) => { if (mounted) {setState(s);} })
      .catch(() => {});

    const unsub = GliphPlayer.addEventListener(
      Event.PlaybackState,
      (data: { state: State }) => {
        if (mounted) {setState({ state: data.state });}
      }
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return state;
}

// ─── useProgress ─────────────────────────────────────────────────────────────

/**
 * Returns live playback progress (position, duration, buffered).
 * @param updateInterval  How often to poll in ms. Defaults to 1000ms.
 *                        Set to 0 to rely solely on native progress events.
 */
export function useProgress(updateInterval = 1000): Progress {
  const [progress, setProgress] = useState<Progress>({
    position: 0,
    duration: 0,
    buffered: 0,
  });

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const update = () => {
      GliphPlayer.getProgress()
        .then((p) => { if (mounted) {setProgress(p);} })
        .catch(() => {});
    };

    update();

    if (updateInterval > 0) {
      timer = setInterval(update, updateInterval);
    }

    // Also listen to native progress events for immediate updates
    const unsub = GliphPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (data: { position: number; duration: number; buffered: number }) => {
        if (mounted) {
          setProgress({
            position: data.position,
            duration: data.duration,
            buffered: data.buffered,
          });
        }
      }
    );

    return () => {
      mounted = false;
      if (timer) {clearInterval(timer);}
      unsub();
    };
  }, [updateInterval]);

  return progress;
}

// ─── useActiveTrack ───────────────────────────────────────────────────────────

/**
 * Returns the currently active track, updating when the track changes.
 */
export function useActiveTrack(): Track | null | undefined {
  const [track, setTrack] = useState<Track | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    GliphPlayer.getActiveTrack()
      .then((t) => { if (mounted) {setTrack(t);} })
      .catch(() => {});

    const unsub = GliphPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (data: { track: Track | null }) => {
        if (mounted) {setTrack(data.track);}
      }
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return track;
}

// ─── useQueue ─────────────────────────────────────────────────────────────────

/**
 * Returns the current queue, updating when tracks are added/removed/changed.
 */
export function useQueue(): Track[] {
  const [queue, setQueue] = useState<Track[]>([]);

  const refresh = useCallback(() => {
    GliphPlayer.getQueue()
      .then(setQueue)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();

    // Re-fetch on any track change event
    const unsub1 = GliphPlayer.addEventListener(Event.PlaybackActiveTrackChanged, refresh);
    const unsub2 = GliphPlayer.addEventListener(Event.PlaybackQueueEnded, refresh);

    return () => {
      unsub1();
      unsub2();
    };
  }, [refresh]);

  return queue;
}

// ─── useRepeatMode ────────────────────────────────────────────────────────────

/**
 * Returns the current repeat mode and a setter.
 */
export function useRepeatMode(): [RepeatMode | null, (mode: RepeatMode) => Promise<void>] {
  const [mode, setMode] = useState<RepeatMode | null>(null);

  useEffect(() => {
    GliphPlayer.getRepeatMode()
      .then(setMode)
      .catch(() => {});

    const unsub = GliphPlayer.addEventListener(
      Event.PlaybackRepeatModeChanged,
      (data) => {
        setMode(data.mode);
      }
    );

    return () => unsub();
  }, []);

  const set = useCallback(async (newMode: RepeatMode) => {
    await GliphPlayer.setRepeatMode(newMode);
    setMode(newMode);
  }, []);

  return [mode, set];
}

// ─── useVolume ────────────────────────────────────────────────────────────────

/**
 * Returns the current volume (0–1) and a setter.
 */
export function useVolume(): [number, (v: number) => Promise<void>] {
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    GliphPlayer.getVolume()
      .then(setVolume)
      .catch(() => {});
  }, []);

  const set = useCallback(async (v: number) => {
    await GliphPlayer.setVolume(v);
    setVolume(v);
  }, []);

  return [volume, set];
}

// ─── useIsPlaying ─────────────────────────────────────────────────────────────

/**
 * Convenience hook — returns { playing, bufferingDuringPlay }.
 */
export function useIsPlaying(): { playing: boolean; bufferingDuringPlay: boolean } {
  const { state } = usePlaybackState();
  return {
    playing: state === State.Playing || state === State.Buffering,
    bufferingDuringPlay: state === State.Buffering,
  };
}
