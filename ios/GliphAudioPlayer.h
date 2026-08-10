#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface GliphAudioPlayer : NSObject

- (instancetype)initWithEventEmitter:(void (^)(NSString *event, NSDictionary * _Nullable data))eventEmitter;

- (void)setupPlayerWithOptions:(NSDictionary *)options
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject;
- (void)destroy;
- (BOOL)isReady;

- (void)addTracks:(NSArray *)tracks
  insertBeforeIndex:(NSInteger)insertBeforeIndex
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject;
- (void)removeTracks:(NSArray *)trackIds
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject;
- (void)removeUpcomingTracksWithResolve:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject;
- (void)skipToIndex:(NSInteger)index
   initialPosition:(double)initialPosition
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject;
- (void)skipToNextWithInitialPosition:(double)initialPosition
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject;
- (void)skipToPreviousWithInitialPosition:(double)initialPosition
                                  resolve:(RCTPromiseResolveBlock)resolve
                                   reject:(RCTPromiseRejectBlock)reject;
- (void)moveFrom:(NSInteger)fromIndex
         toIndex:(NSInteger)toIndex
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject;

- (void)playWithResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)pauseWithResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)stopWithResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)resetWithResolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)seekTo:(double)position resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)seekBy:(double)offset resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)setVolume:(float)volume resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (float)getVolume;
- (void)setRate:(float)rate resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (float)getRate;
- (void)setRepeatMode:(NSInteger)mode resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (NSInteger)getRepeatMode;

- (NSArray<NSDictionary *> *)getQueue;
- (NSNumber * _Nullable)getActiveTrackIndex;
- (NSDictionary * _Nullable)getActiveTrack;
- (NSDictionary * _Nullable)getTrackAtIndex:(NSInteger)index;
- (NSInteger)getQueueSize;

- (NSDictionary *)getPlaybackState;
- (NSDictionary *)getProgress;

- (void)updateMetadataForTrack:(NSInteger)index
                      metadata:(NSDictionary *)metadata
                       resolve:(RCTPromiseResolveBlock)resolve
                        reject:(RCTPromiseRejectBlock)reject;
- (void)clearNowPlayingMetadataWithResolve:(RCTPromiseResolveBlock)resolve
                                    reject:(RCTPromiseRejectBlock)reject;
- (void)updateNowPlayingMetadata:(NSDictionary *)metadata
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject;
- (void)updateOptions:(NSDictionary *)options
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject;

@end

NS_ASSUME_NONNULL_END