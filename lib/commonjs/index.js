"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "AndroidAudioContentType", {
  enumerable: true,
  get: function () {
    return _types.AndroidAudioContentType;
  }
});
Object.defineProperty(exports, "AndroidAudioUsage", {
  enumerable: true,
  get: function () {
    return _types.AndroidAudioUsage;
  }
});
Object.defineProperty(exports, "AppKilledPlaybackBehavior", {
  enumerable: true,
  get: function () {
    return _types.AppKilledPlaybackBehavior;
  }
});
Object.defineProperty(exports, "Capability", {
  enumerable: true,
  get: function () {
    return _types.Capability;
  }
});
Object.defineProperty(exports, "Event", {
  enumerable: true,
  get: function () {
    return _types.Event;
  }
});
Object.defineProperty(exports, "GliphPlayer", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.default;
  }
});
Object.defineProperty(exports, "IOSCategory", {
  enumerable: true,
  get: function () {
    return _types.IOSCategory;
  }
});
Object.defineProperty(exports, "IOSCategoryMode", {
  enumerable: true,
  get: function () {
    return _types.IOSCategoryMode;
  }
});
Object.defineProperty(exports, "IOSCategoryOptions", {
  enumerable: true,
  get: function () {
    return _types.IOSCategoryOptions;
  }
});
Object.defineProperty(exports, "PitchAlgorithm", {
  enumerable: true,
  get: function () {
    return _types.PitchAlgorithm;
  }
});
Object.defineProperty(exports, "RatingType", {
  enumerable: true,
  get: function () {
    return _types.RatingType;
  }
});
Object.defineProperty(exports, "RepeatMode", {
  enumerable: true,
  get: function () {
    return _types.RepeatMode;
  }
});
Object.defineProperty(exports, "State", {
  enumerable: true,
  get: function () {
    return _types.State;
  }
});
Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.default;
  }
});
Object.defineProperty(exports, "isBuffering", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.isBuffering;
  }
});
Object.defineProperty(exports, "isPaused", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.isPaused;
  }
});
Object.defineProperty(exports, "isPlaying", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.isPlaying;
  }
});
Object.defineProperty(exports, "isStopped", {
  enumerable: true,
  get: function () {
    return _GliphPlayer.isStopped;
  }
});
Object.defineProperty(exports, "useActiveTrack", {
  enumerable: true,
  get: function () {
    return _hooks.useActiveTrack;
  }
});
Object.defineProperty(exports, "useIsPlaying", {
  enumerable: true,
  get: function () {
    return _hooks.useIsPlaying;
  }
});
Object.defineProperty(exports, "usePlaybackState", {
  enumerable: true,
  get: function () {
    return _hooks.usePlaybackState;
  }
});
Object.defineProperty(exports, "useProgress", {
  enumerable: true,
  get: function () {
    return _hooks.useProgress;
  }
});
Object.defineProperty(exports, "useQueue", {
  enumerable: true,
  get: function () {
    return _hooks.useQueue;
  }
});
Object.defineProperty(exports, "useRepeatMode", {
  enumerable: true,
  get: function () {
    return _hooks.useRepeatMode;
  }
});
Object.defineProperty(exports, "useTrackPlayerEvents", {
  enumerable: true,
  get: function () {
    return _hooks.useTrackPlayerEvents;
  }
});
Object.defineProperty(exports, "useVolume", {
  enumerable: true,
  get: function () {
    return _hooks.useVolume;
  }
});
var _GliphPlayer = _interopRequireWildcard(require("./GliphPlayer"));
var _types = require("./types");
var _hooks = require("./hooks");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
//# sourceMappingURL=index.js.map