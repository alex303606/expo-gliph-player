#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNGliphPlayerSpec/RNGliphPlayerSpec.h>

@interface GliphPlayerModule : RCTEventEmitter <NativeGliphPlayerSpec>
#else
@interface GliphPlayerModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end