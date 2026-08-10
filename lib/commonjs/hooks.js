"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useActiveTrack = useActiveTrack;
exports.useIsPlaying = useIsPlaying;
exports.usePlaybackState = usePlaybackState;
exports.useProgress = useProgress;
exports.useQueue = useQueue;
exports.useRepeatMode = useRepeatMode;
exports.useTrackPlayerEvents = useTrackPlayerEvents;
exports.useVolume = useVolume;
var _react = require("react");
var _GliphPlayer = _interopRequireDefault(require("./GliphPlayer"));
var _types = require("./types");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * hooks.ts — React hooks for react-native-gliph-player
 */

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
function useTrackPlayerEvents(events, handler) {
  const handlerRef = (0, _react.useRef)(handler);
  handlerRef.current = handler;
  (0, _react.useEffect)(() => {
    const unsubs = events.map(event => _GliphPlayer.default.addEventListener(event, data => {
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
function usePlaybackState() {
  const [state, setState] = (0, _react.useState)({
    state: _types.State.None
  });
  (0, _react.useEffect)(() => {
    let mounted = true;

    // Fetch initial state
    _GliphPlayer.default.getPlaybackState().then(s => {
      if (mounted) {
        setState(s);
      }
    }).catch(() => {});
    const unsub = _GliphPlayer.default.addEventListener(_types.Event.PlaybackState, data => {
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
function useProgress(updateInterval = 1000) {
  const [progress, setProgress] = (0, _react.useState)({
    position: 0,
    duration: 0,
    buffered: 0
  });
  (0, _react.useEffect)(() => {
    let mounted = true;
    let timer = null;
    const update = () => {
      _GliphPlayer.default.getProgress().then(p => {
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
    const unsub = _GliphPlayer.default.addEventListener(_types.Event.PlaybackProgressUpdated, data => {
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
function useActiveTrack() {
  const [track, setTrack] = (0, _react.useState)(undefined);
  (0, _react.useEffect)(() => {
    let mounted = true;
    _GliphPlayer.default.getActiveTrack().then(t => {
      if (mounted) {
        setTrack(t);
      }
    }).catch(() => {});
    const unsub = _GliphPlayer.default.addEventListener(_types.Event.PlaybackActiveTrackChanged, data => {
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
function useQueue() {
  const [queue, setQueue] = (0, _react.useState)([]);
  const refresh = (0, _react.useCallback)(() => {
    _GliphPlayer.default.getQueue().then(setQueue).catch(() => {});
  }, []);
  (0, _react.useEffect)(() => {
    refresh();

    // Re-fetch on any track change event
    const unsub1 = _GliphPlayer.default.addEventListener(_types.Event.PlaybackActiveTrackChanged, refresh);
    const unsub2 = _GliphPlayer.default.addEventListener(_types.Event.PlaybackQueueEnded, refresh);
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
function useRepeatMode() {
  const [mode, setMode] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    _GliphPlayer.default.getRepeatMode().then(setMode).catch(() => {});
    const unsub = _GliphPlayer.default.addEventListener(_types.Event.PlaybackRepeatModeChanged, data => {
      setMode(data.mode);
    });
    return () => unsub();
  }, []);
  const set = (0, _react.useCallback)(async newMode => {
    await _GliphPlayer.default.setRepeatMode(newMode);
    setMode(newMode);
  }, []);
  return [mode, set];
}

// ─── useVolume ────────────────────────────────────────────────────────────────

/**
 * Returns the current volume (0–1) and a setter.
 */
function useVolume() {
  const [volume, setVolume] = (0, _react.useState)(1);
  (0, _react.useEffect)(() => {
    _GliphPlayer.default.getVolume().then(setVolume).catch(() => {});
  }, []);
  const set = (0, _react.useCallback)(async v => {
    await _GliphPlayer.default.setVolume(v);
    setVolume(v);
  }, []);
  return [volume, set];
}

// ─── useIsPlaying ─────────────────────────────────────────────────────────────

/**
 * Convenience hook — returns { playing, bufferingDuringPlay }.
 */
function useIsPlaying() {
  const {
    state
  } = usePlaybackState();
  return {
    playing: state === _types.State.Playing || state === _types.State.Buffering,
    bufferingDuringPlay: state === _types.State.Buffering
  };
}
//# sourceMappingURL=hooks.js.map