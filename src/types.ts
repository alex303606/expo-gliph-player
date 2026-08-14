/**
 * types.ts — Public TypeScript types for react-native-gliph-player
 */

// ─── Track ───────────────────────────────────────────────────────────────────

export interface Track {
  /** Unique identifier for the track (auto-generated if not provided) */
  id?: string;
  /** URL of the audio file (local or remote) */
  url: string | number; // number = require('./file.mp3')
  /** Track title */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name */
  album?: string;
  /** Artwork URL or local require() */
  artwork?: string | number;
  /** Duration in seconds */
  duration?: number;
  /** Genre */
  genre?: string;
  /** Release date string */
  date?: string;
  /** Description / lyrics */
  description?: string;
  /** Rating (0–1 or 0–5 depending on ratingType) */
  rating?: number;
  /** Whether this is a live stream */
  isLiveStream?: boolean;
  /** Custom HTTP headers for the audio request */
  headers?: Record<string, string>;
  /** iOS pitch algorithm */
  pitchAlgorithm?: PitchAlgorithm;
  /** Custom user agent */
  userAgent?: string;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum State {
  /** No player setup yet */
  None = 'none',
  /** Player is ready but not playing */
  Ready = 'ready',
  /** Audio is playing */
  Playing = 'playing',
  /** Audio is paused */
  Paused = 'paused',
  /** Player is stopped */
  Stopped = 'stopped',
  /** Buffering / loading */
  Buffering = 'buffering',
  /** Loading initial data */
  Loading = 'loading',
  /** An error occurred */
  Error = 'error',
  /** End of queue reached */
  Ended = 'ended',
}

export enum Event {
  /** Playback state changed */
  PlaybackState = 'playback-state',
  /** Playback error */
  PlaybackError = 'playback-error',
  /** Active track changed */
  PlaybackActiveTrackChanged = 'playback-active-track-changed',
  /** Queue ended */
  PlaybackQueueEnded = 'playback-queue-ended',
  /** Track ended */
  PlaybackTrackEnded = 'playback-track-ended',
  /** Playback progress updated */
  PlaybackProgressUpdated = 'playback-progress-updated',
  /** Metadata received (e.g. from stream) */
  PlaybackMetadataReceived = 'playback-metadata-received',
  /** Repeat mode changed */
  PlaybackRepeatModeChanged = 'playback-repeat-mode-changed',

  // Remote control events (from notification / lock screen / headphones)
  RemotePlay = 'remote-play',
  RemotePause = 'remote-pause',
  RemoteStop = 'remote-stop',
  RemoteSkip = 'remote-skip',
  RemoteNext = 'remote-next',
  RemotePrevious = 'remote-previous',
  RemoteJumpForward = 'remote-jump-forward',
  RemoteJumpBackward = 'remote-jump-backward',
  RemoteSeek = 'remote-seek',
  RemoteSetRating = 'remote-set-rating',
  RemoteDuck = 'remote-duck',
  RemoteLike = 'remote-like',
  RemoteDislike = 'remote-dislike',
  RemoteBookmark = 'remote-bookmark',
}

export enum RepeatMode {
  /** No repeat */
  Off = 0,
  /** Repeat current track */
  Track = 1,
  /** Repeat entire queue */
  Queue = 2,
}

export enum Capability {
  Play = 'play',
  Pause = 'pause',
  Stop = 'stop',
  SeekTo = 'seek-to',
  Skip = 'skip',
  SkipToNext = 'skip-to-next',
  SkipToPrevious = 'skip-to-previous',
  JumpForward = 'jump-forward',
  JumpBackward = 'jump-backward',
  SetRating = 'set-rating',
  Like = 'like',
  Dislike = 'dislike',
  Bookmark = 'bookmark',
}

export enum RatingType {
  Heart = 'heart',
  ThumbsUpDown = 'thumbs-up-down',
  ThreeStars = '3-stars',
  FourStars = '4-stars',
  FiveStars = '5-stars',
  Percentage = 'percentage',
}

export enum PitchAlgorithm {
  /** Best quality, higher CPU */
  Quality = 0,
  /** Balanced */
  Consistency = 1,
  /** Lowest CPU */
  Varispeed = 2,
}

export enum IOSCategory {
  Playback = 'playback',
  PlayAndRecord = 'playAndRecord',
  MultiRoute = 'multiRoute',
  Ambient = 'ambient',
  SoloAmbient = 'soloAmbient',
  Record = 'record',
}

export enum IOSCategoryMode {
  Default = 'default',
  GameChat = 'gameChat',
  Measurement = 'measurement',
  MoviePlayback = 'moviePlayback',
  SpokenAudio = 'spokenAudio',
  VideoChat = 'videoChat',
  VideoRecording = 'videoRecording',
  VoiceChat = 'voiceChat',
  VoicePrompt = 'voicePrompt',
}

export enum IOSCategoryOptions {
  MixWithOthers = 'mixWithOthers',
  DuckOthers = 'duckOthers',
  InterruptSpokenAudioAndMixWithOthers = 'interruptSpokenAudioAndMixWithOthers',
  AllowBluetooth = 'allowBluetooth',
  AllowBluetoothA2DP = 'allowBluetoothA2DP',
  AllowAirPlay = 'allowAirPlay',
  DefaultToSpeaker = 'defaultToSpeaker',
}

export enum AndroidAudioContentType {
  Unknown = 0,
  Speech = 1,
  Music = 2,
  Movie = 3,
  Sonification = 4,
}

export enum AndroidAudioUsage {
  Unknown = 0,
  Media = 1,
  VoiceCommunication = 2,
  VoiceCommunicationSignalling = 3,
  Alarm = 4,
  Notification = 5,
  NotificationRingtone = 6,
  NotificationEvent = 10,
  AssistanceAccessibility = 11,
  AssistanceNavigationGuidance = 12,
  AssistanceSonification = 13,
  Game = 14,
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface PlayerOptions {
  /** Minimum seconds to buffer before playback starts (Android) */
  minBuffer?: number;
  /** Maximum seconds to buffer ahead (Android) */
  maxBuffer?: number;
  /** Seconds buffered before playback resumes after stall (Android) */
  playBuffer?: number;
  /** Seconds of audio to keep behind current position (Android) */
  backBuffer?: number;
  /** Max cache size in bytes (Android) */
  maxCacheSize?: number;
  /** iOS audio session category */
  iosCategory?: IOSCategory;
  /** iOS audio session category mode */
  iosCategoryMode?: IOSCategoryMode;
  /** iOS audio session category options */
  iosCategoryOptions?: IOSCategoryOptions[];
  /** Wait for buffer before auto-playing */
  waitForBuffer?: boolean;
  /** Auto handle audio interruptions (calls, etc.) */
  autoHandleInterruptions?: boolean;
  /** Auto update Now Playing metadata */
  autoUpdateMetadata?: boolean;
  /** Android-specific options */
  android?: {
    appKilledPlaybackBehavior?: AppKilledPlaybackBehavior;
    audioContentType?: AndroidAudioContentType | string;
    audioUsage?: AndroidAudioUsage | string;
    autoSkipOnError?: boolean;
  };
  /** Progress update interval in seconds */
  progressUpdateEventInterval?: number;
}

export enum AppKilledPlaybackBehavior {
  /** Stop playback when app is killed */
  StopPlaybackAndRemoveNotification = 'StopPlaybackAndRemoveNotification',
  /** Continue playback in background service */
  ContinuePlayback = 'ContinuePlayback',
  /** Pause playback but keep notification */
  PausePlayback = 'PausePlayback',
}

export interface UpdateOptions {
  /** Notification icon (Android) — resource name */
  icon?: number;
  /** Notification icon resource name (Android) */
  notificationIcon?: string;
  /** Playback capabilities to show in notification */
  capabilities?: Capability[];
  /** Capabilities to show when paused */
  notificationCapabilities?: Capability[];
  /** Capabilities to show in compact notification view */
  compactCapabilities?: Capability[];
  /** Jump forward interval in seconds */
  forwardJumpInterval?: number;
  /** Jump backward interval in seconds */
  backwardJumpInterval?: number;
  /** Progress update interval in seconds */
  progressUpdateEventInterval?: number;
  /** Rating type */
  ratingType?: RatingType;
  /** Android notification color (hex string) */
  color?: number;
  /** Android notification channel name */
  notificationChannelName?: string;
  /** Android custom actions */
  customActions?: CustomAction[];
}

export interface CustomAction {
  icon: number;
  title: string;
  name: string;
}

// ─── Playback state / progress ───────────────────────────────────────────────

export interface PlaybackState {
  state: State;
  error?: PlaybackError;
}

export interface Progress {
  /** Current position in seconds */
  position: number;
  /** Total duration in seconds */
  duration: number;
  /** Buffered position in seconds */
  buffered: number;
}

export interface PlaybackError {
  code: string;
  message: string;
}

// ─── Event payloads ──────────────────────────────────────────────────────────

export interface PlaybackRepeatModeChangedEvent {
  mode: RepeatMode;
}

export interface PlaybackStateEvent {
  state: State;
}

export interface PlaybackErrorEvent {
  code: string;
  message: string;
}

export interface PlaybackActiveTrackChangedEvent {
  index: number | null;
  track: Track | null;
  lastIndex: number | null;
  lastTrack: Track | null;
  lastPosition: number;
}

export interface PlaybackQueueEndedEvent {
  index: number;
  position: number;
  track: Track | null;
}

export interface PlaybackProgressUpdatedEvent {
  position: number;
  duration: number;
  buffered: number;
  track: number;
}

export interface PlaybackTrackEndedEvent {
  index: number;
}

export interface PlaybackMetadataReceivedEvent {
  source: 'icy' | 'id3' | 'unknown';
  title?: string;
  url?: string;
  artist?: string;
  album?: string;
  date?: string;
  genre?: string;
}

export interface RemoteSeekEvent {
  position: number;
}

export interface RemoteJumpForwardEvent {
  interval: number;
}

export interface RemoteJumpBackwardEvent {
  interval: number;
}

export interface RemoteSetRatingEvent {
  rating: number;
}

export interface RemoteDuckEvent {
  paused: boolean;
  permanent: boolean;
  focusLoss: boolean;
}

export interface RemoteSkipEvent {
  index: number;
}

// ─── Event map ───────────────────────────────────────────────────────────────

export interface EventPayloadByEvent {
  [Event.PlaybackState]: PlaybackStateEvent;
  [Event.PlaybackError]: PlaybackErrorEvent;
  [Event.PlaybackActiveTrackChanged]: PlaybackActiveTrackChangedEvent;
  [Event.PlaybackQueueEnded]: PlaybackQueueEndedEvent;
  [Event.PlaybackTrackEnded]: PlaybackTrackEndedEvent;
  [Event.PlaybackProgressUpdated]: PlaybackProgressUpdatedEvent;
  [Event.PlaybackMetadataReceived]: PlaybackMetadataReceivedEvent;
  [Event.PlaybackRepeatModeChanged]: PlaybackRepeatModeChangedEvent;
  [Event.RemotePlay]: void;
  [Event.RemotePause]: void;
  [Event.RemoteStop]: void;
  [Event.RemoteNext]: void;
  [Event.RemotePrevious]: void;
  [Event.RemoteSkip]: RemoteSkipEvent;
  [Event.RemoteJumpForward]: RemoteJumpForwardEvent;
  [Event.RemoteJumpBackward]: RemoteJumpBackwardEvent;
  [Event.RemoteSeek]: RemoteSeekEvent;
  [Event.RemoteSetRating]: RemoteSetRatingEvent;
  [Event.RemoteDuck]: RemoteDuckEvent;
  [Event.RemoteLike]: void;
  [Event.RemoteDislike]: void;
  [Event.RemoteBookmark]: void;
}
