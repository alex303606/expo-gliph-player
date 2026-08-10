"use strict";

/**
 * hooks.ts — React hooks for react-native-gliph-player
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import GliphPlayer from './GliphPlayer';
import { Event, State } from './types';
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
export function useTrackPlayerEvents(events, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const unsubs = events.map(event => GliphPlayer.addEventListener(event, data => {
      handlerRef.current({
        ...data,
        type: event
      });
    }));
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, events);
}

// ─── usePlaybackState ─────────────────────────────────────────────────────────

/**
 * Returns the current playback state, updating reactively.
 */
export function usePlaybackState() {
  const [state, setState] = useState({
    state: State.None
  });
  useEffect(() => {
    let mounted = true;

    // Fetch initial state
    GliphPlayer.getPlaybackState().then(s => {
      if (mounted) {
        setState(s);
      }
    }).catch(() => {});
    const unsub = GliphPlayer.addEventListener(Event.PlaybackState, data => {
      if (mounted) {
        setState({
          state: data.state
        });
      }
    });
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
export function useProgress(updateInterval = 1000) {
  const [progress, setProgress] = useState({
    position: 0,
    duration: 0,
    buffered: 0
  });
  useEffect(() => {
    let mounted = true;
    let timer = null;
    const update = () => {
      GliphPlayer.getProgress().then(p => {
        if (mounted) {
          setProgress(p);
        }
      }).catch(() => {});
    };
    update();
    if (updateInterval > 0) {
      timer = setInterval(update, updateInterval);
    }

    // Also listen to native progress events for immediate updates
    const unsub = GliphPlayer.addEventListener(Event.PlaybackProgressUpdated, data => {
      if (mounted) {
        setProgress({
          position: data.position,
          duration: data.duration,
          buffered: data.buffered
        });
      }
    });
    return () => {
      mounted = false;
      if (timer) {
        clearInterval(timer);
      }
      unsub();
    };
  }, [updateInterval]);
  return progress;
}

// ─── useActiveTrack ───────────────────────────────────────────────────────────

/**
 * Returns the currently active track, updating when the track changes.
 */
export function useActiveTrack() {
  const [track, setTrack] = useState(undefined);
  useEffect(() => {
    let mounted = true;
    GliphPlayer.getActiveTrack().then(t => {
      if (mounted) {
        setTrack(t);
      }
    }).catch(() => {});
    const unsub = GliphPlayer.addEventListener(Event.PlaybackActiveTrackChanged, data => {
      if (mounted) {
        setTrack(data.track);
      }
    });
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
export function useQueue() {
  const [queue, setQueue] = useState([]);
  const refresh = useCallback(() => {
    GliphPlayer.getQueue().then(setQueue).catch(() => {});
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
export function useRepeatMode() {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    GliphPlayer.getRepeatMode().then(setMode).catch(() => {});
    const unsub = GliphPlayer.addEventListener(Event.PlaybackRepeatModeChanged, data => {
      setMode(data.mode);
    });
    return () => unsub();
  }, []);
  const set = useCallback(async newMode => {
    await GliphPlayer.setRepeatMode(newMode);
    setMode(newMode);
  }, []);
  return [mode, set];
}

// ─── useVolume ────────────────────────────────────────────────────────────────

/**
 * Returns the current volume (0–1) and a setter.
 */
export function useVolume() {
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    GliphPlayer.getVolume().then(setVolume).catch(() => {});
  }, []);
  const set = useCallback(async v => {
    await GliphPlayer.setVolume(v);
    setVolume(v);
  }, []);
  return [volume, set];
}

// ─── useIsPlaying ─────────────────────────────────────────────────────────────

/**
 * Convenience hook — returns { playing, bufferingDuringPlay }.
 */
export function useIsPlaying() {
  const {
    state
  } = usePlaybackState();
  return {
    playing: state === State.Playing || state === State.Buffering,
    bufferingDuringPlay: state === State.Buffering
  };
}
//# sourceMappingURL=hooks.js.map