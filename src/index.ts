/**
 * react-native-gliph-player
 * Public API entry point
 */

// Default export — the player API
export { default } from './GliphPlayer';
export { default as GliphPlayer } from './GliphPlayer';
export { isPlaying, isPaused, isBuffering, isStopped } from './GliphPlayer';

// Types
export type {
  Track,
  PlayerOptions,
  UpdateOptions,
  Progress,
  PlaybackState,
  PlaybackError,
  CustomAction,
  EventPayloadByEvent,
  PlaybackStateEvent,
  PlaybackErrorEvent,
  PlaybackActiveTrackChangedEvent,
  PlaybackQueueEndedEvent,
  PlaybackProgressUpdatedEvent,
  PlaybackMetadataReceivedEvent,
  RemoteSeekEvent,
  RemoteJumpForwardEvent,
  RemoteJumpBackwardEvent,
  RemoteSetRatingEvent,
  RemoteDuckEvent,
  RemoteSkipEvent,
} from './types';

// Enums
export {
  State,
  Event,
  RepeatMode,
  Capability,
  RatingType,
  PitchAlgorithm,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
  AndroidAudioContentType,
  AndroidAudioUsage,
  AppKilledPlaybackBehavior,
} from './types';

// Hooks
export {
  useTrackPlayerEvents,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  useQueue,
  useRepeatMode,
  useVolume,
  useIsPlaying,
} from './hooks';
