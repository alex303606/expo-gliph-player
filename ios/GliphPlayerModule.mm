/**
 * GliphPlayerModule.mm
 *
 * Objective-C++ bridge that connects React Native (New + Old Arch) to
 * the Swift GliphAudioPlayer implementation.
 */

#import "GliphPlayerModule.h"
#import "expo_gliph_player-Swift.h"

@interface GliphPlayerModule ()
@property (nonatomic, strong) GliphAudioPlayer *player;
@end

@implementation GliphPlayerModule {
  bool _hasListeners;
}

RCT_EXPORT_MODULE(RNGliphPlayer)

- (instancetype)init {
  if (self = [super init]) {
    __weak GliphPlayerModule *weakSelf = self;
    _player = [[GliphAudioPlayer alloc] initWithEventEmitter:^(NSString *event, NSDictionary *data) {
      [weakSelf sendEventWithName:event body:data];
    }];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"playback-state",
    @"playback-error",
    @"playback-active-track-changed",
    @"playback-queue-ended",
    @"playback-progress-updated",
    @"playback-metadata-received",
    @"remote-play",
    @"remote-pause",
    @"remote-stop",
    @"remote-next",
    @"remote-previous",
    @"remote-skip",
    @"remote-jump-forward",
    @"remote-jump-backward",
    @"remote-seek",
    @"remote-set-rating",
    @"remote-duck",
    @"remote-like",
    @"remote-dislike",
    @"remote-bookmark",
  ];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO; }

RCT_EXPORT_METHOD(setupPlayer:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player setupPlayerWithOptions:options resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(destroy) {
  [_player destroy];
}

RCT_EXPORT_METHOD(isServiceRunning:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  resolve(@([_player isReady]));
}

RCT_EXPORT_METHOD(add:(NSArray *)tracks
                  insertBeforeIndex:(double)insertBeforeIndex
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player addTracks:tracks insertBeforeIndex:(NSInteger)insertBeforeIndex resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(remove:(NSArray *)trackIds
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player removeTracks:trackIds resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(removeUpcomingTracks:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player removeUpcomingTracksWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(skip:(double)index
                  initialPosition:(double)initialPosition
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player skipToIndex:(NSInteger)index initialPosition:initialPosition resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(skipToNext:(double)initialPosition
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player skipToNextWithInitialPosition:initialPosition resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(skipToPrevious:(double)initialPosition
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player skipToPreviousWithInitialPosition:initialPosition resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(move:(double)fromIndex
                  toIndex:(double)toIndex
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player moveFrom:(NSInteger)fromIndex toIndex:(NSInteger)toIndex resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(play:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [_player playWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(pause:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [_player pauseWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [_player stopWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(reset:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [_player resetWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(seekTo:(double)position
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player seekTo:position resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(seekBy:(double)offset
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player seekBy:offset resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(setVolume:(double)volume
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player setVolume:(float)volume resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getVolume:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve(@([_player getVolume]));
}

RCT_EXPORT_METHOD(setRate:(double)rate
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player setRate:(float)rate resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getRate:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve(@([_player getRate]));
}

RCT_EXPORT_METHOD(setRepeatMode:(double)mode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player setRepeatMode:(NSInteger)mode resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getRepeatMode:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve(@([_player getRepeatMode]));
}

RCT_EXPORT_METHOD(getQueue:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve([_player getQueue]);
}

RCT_EXPORT_METHOD(getActiveTrackIndex:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  NSNumber *idx = [_player getActiveTrackIndex];
  resolve(idx);
}

RCT_EXPORT_METHOD(getActiveTrack:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve([_player getActiveTrack]);
}

RCT_EXPORT_METHOD(getTrack:(double)index
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  resolve([_player getTrackAtIndex:(NSInteger)index]);
}

RCT_EXPORT_METHOD(getQueueSize:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve(@([_player getQueueSize]));
}

RCT_EXPORT_METHOD(getPlaybackState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve([_player getPlaybackState]);
}

RCT_EXPORT_METHOD(getProgress:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  resolve([_player getProgress]);
}

RCT_EXPORT_METHOD(updateMetadataForTrack:(double)index
                  metadata:(NSDictionary *)metadata
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player updateMetadataForTrack:(NSInteger)index metadata:metadata resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(clearNowPlayingMetadata:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
  [_player clearNowPlayingMetadataWithResolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(updateNowPlayingMetadata:(NSDictionary *)metadata
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player updateNowPlayingMetadata:metadata resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(updateOptions:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
  [_player updateOptions:options resolve:resolve reject:reject];
}

// ── New Architecture (TurboModule) ────────────────────────────────────────────

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeGliphPlayerSpecJSI>(params);
}
#endif

@end
