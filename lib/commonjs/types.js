"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.State = exports.RepeatMode = exports.RatingType = exports.PitchAlgorithm = exports.IOSCategoryOptions = exports.IOSCategoryMode = exports.IOSCategory = exports.Event = exports.Capability = exports.AppKilledPlaybackBehavior = exports.AndroidAudioUsage = exports.AndroidAudioContentType = void 0;
/**
 * types.ts — Public TypeScript types for react-native-gliph-player
 */
// ─── Track ───────────────────────────────────────────────────────────────────
// ─── Enums ───────────────────────────────────────────────────────────────────
let State = exports.State = /*#__PURE__*/function (State) {
  /** No player setup yet */
  State["None"] = "none";
  /** Player is ready but not playing */
  State["Ready"] = "ready";
  /** Audio is playing */
  State["Playing"] = "playing";
  /** Audio is paused */
  State["Paused"] = "paused";
  /** Player is stopped */
  State["Stopped"] = "stopped";
  /** Buffering / loading */
  State["Buffering"] = "buffering";
  /** Loading initial data */
  State["Loading"] = "loading";
  /** An error occurred */
  State["Error"] = "error";
  /** End of queue reached */
  State["Ended"] = "ended";
  return State;
}({});
let Event = exports.Event = /*#__PURE__*/function (Event) {
  /** Playback state changed */
  Event["PlaybackState"] = "playback-state";
  /** Playback error */
  Event["PlaybackError"] = "playback-error";
  /** Active track changed */
  Event["PlaybackActiveTrackChanged"] = "playback-active-track-changed";
  /** Queue ended */
  Event["PlaybackQueueEnded"] = "playback-queue-ended";
  /** Track ended */
  Event["PlaybackTrackEnded"] = "playback-track-ended";
  /** Playback progress updated */
  Event["PlaybackProgressUpdated"] = "playback-progress-updated";
  /** Metadata received (e.g. from stream) */
  Event["PlaybackMetadataReceived"] = "playback-metadata-received";
  /** Repeat mode changed */
  Event["PlaybackRepeatModeChanged"] = "playback-repeat-mode-changed";
  // Remote control events (from notification / lock screen / headphones)
  Event["RemotePlay"] = "remote-play";
  Event["RemotePause"] = "remote-pause";
  Event["RemoteStop"] = "remote-stop";
  Event["RemoteSkip"] = "remote-skip";
  Event["RemoteNext"] = "remote-next";
  Event["RemotePrevious"] = "remote-previous";
  Event["RemoteJumpForward"] = "remote-jump-forward";
  Event["RemoteJumpBackward"] = "remote-jump-backward";
  Event["RemoteSeek"] = "remote-seek";
  Event["RemoteSetRating"] = "remote-set-rating";
  Event["RemoteDuck"] = "remote-duck";
  Event["RemoteLike"] = "remote-like";
  Event["RemoteDislike"] = "remote-dislike";
  Event["RemoteBookmark"] = "remote-bookmark";
  return Event;
}({});
let RepeatMode = exports.RepeatMode = /*#__PURE__*/function (RepeatMode) {
  /** No repeat */
  RepeatMode[RepeatMode["Off"] = 0] = "Off";
  /** Repeat current track */
  RepeatMode[RepeatMode["Track"] = 1] = "Track";
  /** Repeat entire queue */
  RepeatMode[RepeatMode["Queue"] = 2] = "Queue";
  return RepeatMode;
}({});
let Capability = exports.Capability = /*#__PURE__*/function (Capability) {
  Capability["Play"] = "play";
  Capability["Pause"] = "pause";
  Capability["Stop"] = "stop";
  Capability["SeekTo"] = "seek-to";
  Capability["Skip"] = "skip";
  Capability["SkipToNext"] = "skip-to-next";
  Capability["SkipToPrevious"] = "skip-to-previous";
  Capability["JumpForward"] = "jump-forward";
  Capability["JumpBackward"] = "jump-backward";
  Capability["SetRating"] = "set-rating";
  Capability["Like"] = "like";
  Capability["Dislike"] = "dislike";
  Capability["Bookmark"] = "bookmark";
  return Capability;
}({});
let RatingType = exports.RatingType = /*#__PURE__*/function (RatingType) {
  RatingType["Heart"] = "heart";
  RatingType["ThumbsUpDown"] = "thumbs-up-down";
  RatingType["ThreeStars"] = "3-stars";
  RatingType["FourStars"] = "4-stars";
  RatingType["FiveStars"] = "5-stars";
  RatingType["Percentage"] = "percentage";
  return RatingType;
}({});
let PitchAlgorithm = exports.PitchAlgorithm = /*#__PURE__*/function (PitchAlgorithm) {
  /** Best quality, higher CPU */
  PitchAlgorithm[PitchAlgorithm["Quality"] = 0] = "Quality";
  /** Balanced */
  PitchAlgorithm[PitchAlgorithm["Consistency"] = 1] = "Consistency";
  /** Lowest CPU */
  PitchAlgorithm[PitchAlgorithm["Varispeed"] = 2] = "Varispeed";
  return PitchAlgorithm;
}({});
let IOSCategory = exports.IOSCategory = /*#__PURE__*/function (IOSCategory) {
  IOSCategory["Playback"] = "playback";
  IOSCategory["PlayAndRecord"] = "playAndRecord";
  IOSCategory["MultiRoute"] = "multiRoute";
  IOSCategory["Ambient"] = "ambient";
  IOSCategory["SoloAmbient"] = "soloAmbient";
  IOSCategory["Record"] = "record";
  return IOSCategory;
}({});
let IOSCategoryMode = exports.IOSCategoryMode = /*#__PURE__*/function (IOSCategoryMode) {
  IOSCategoryMode["Default"] = "default";
  IOSCategoryMode["GameChat"] = "gameChat";
  IOSCategoryMode["Measurement"] = "measurement";
  IOSCategoryMode["MoviePlayback"] = "moviePlayback";
  IOSCategoryMode["SpokenAudio"] = "spokenAudio";
  IOSCategoryMode["VideoChat"] = "videoChat";
  IOSCategoryMode["VideoRecording"] = "videoRecording";
  IOSCategoryMode["VoiceChat"] = "voiceChat";
  IOSCategoryMode["VoicePrompt"] = "voicePrompt";
  return IOSCategoryMode;
}({});
let IOSCategoryOptions = exports.IOSCategoryOptions = /*#__PURE__*/function (IOSCategoryOptions) {
  IOSCategoryOptions["MixWithOthers"] = "mixWithOthers";
  IOSCategoryOptions["DuckOthers"] = "duckOthers";
  IOSCategoryOptions["InterruptSpokenAudioAndMixWithOthers"] = "interruptSpokenAudioAndMixWithOthers";
  IOSCategoryOptions["AllowBluetooth"] = "allowBluetooth";
  IOSCategoryOptions["AllowBluetoothA2DP"] = "allowBluetoothA2DP";
  IOSCategoryOptions["AllowAirPlay"] = "allowAirPlay";
  IOSCategoryOptions["DefaultToSpeaker"] = "defaultToSpeaker";
  return IOSCategoryOptions;
}({});
let AndroidAudioContentType = exports.AndroidAudioContentType = /*#__PURE__*/function (AndroidAudioContentType) {
  AndroidAudioContentType[AndroidAudioContentType["Unknown"] = 0] = "Unknown";
  AndroidAudioContentType[AndroidAudioContentType["Speech"] = 1] = "Speech";
  AndroidAudioContentType[AndroidAudioContentType["Music"] = 2] = "Music";
  AndroidAudioContentType[AndroidAudioContentType["Movie"] = 3] = "Movie";
  AndroidAudioContentType[AndroidAudioContentType["Sonification"] = 4] = "Sonification";
  return AndroidAudioContentType;
}({});
let AndroidAudioUsage = exports.AndroidAudioUsage = /*#__PURE__*/function (AndroidAudioUsage) {
  AndroidAudioUsage[AndroidAudioUsage["Unknown"] = 0] = "Unknown";
  AndroidAudioUsage[AndroidAudioUsage["Media"] = 1] = "Media";
  AndroidAudioUsage[AndroidAudioUsage["VoiceCommunication"] = 2] = "VoiceCommunication";
  AndroidAudioUsage[AndroidAudioUsage["VoiceCommunicationSignalling"] = 3] = "VoiceCommunicationSignalling";
  AndroidAudioUsage[AndroidAudioUsage["Alarm"] = 4] = "Alarm";
  AndroidAudioUsage[AndroidAudioUsage["Notification"] = 5] = "Notification";
  AndroidAudioUsage[AndroidAudioUsage["NotificationRingtone"] = 6] = "NotificationRingtone";
  AndroidAudioUsage[AndroidAudioUsage["NotificationEvent"] = 10] = "NotificationEvent";
  AndroidAudioUsage[AndroidAudioUsage["AssistanceAccessibility"] = 11] = "AssistanceAccessibility";
  AndroidAudioUsage[AndroidAudioUsage["AssistanceNavigationGuidance"] = 12] = "AssistanceNavigationGuidance";
  AndroidAudioUsage[AndroidAudioUsage["AssistanceSonification"] = 13] = "AssistanceSonification";
  AndroidAudioUsage[AndroidAudioUsage["Game"] = 14] = "Game";
  return AndroidAudioUsage;
}({}); // ─── Options ─────────────────────────────────────────────────────────────────
let AppKilledPlaybackBehavior = exports.AppKilledPlaybackBehavior = /*#__PURE__*/function (AppKilledPlaybackBehavior) {
  /** Stop playback when app is killed */
  AppKilledPlaybackBehavior["StopPlaybackAndRemoveNotification"] = "StopPlaybackAndRemoveNotification";
  /** Continue playback in background service */
  AppKilledPlaybackBehavior["ContinuePlayback"] = "ContinuePlayback";
  /** Pause playback but keep notification */
  AppKilledPlaybackBehavior["PausePlayback"] = "PausePlayback";
  return AppKilledPlaybackBehavior;
}({}); // ─── Playback state / progress ───────────────────────────────────────────────
// ─── Event payloads ──────────────────────────────────────────────────────────
// ─── Event map ───────────────────────────────────────────────────────────────
//# sourceMappingURL=types.js.map