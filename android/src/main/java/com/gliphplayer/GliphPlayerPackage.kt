package com.gliphplayer

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * GliphPlayerPackage
 *
 * Registers the TurboModule with React Native.
 * TurboReactPackage is used instead of ReactPackage to support
 * the New Architecture (lazy loading, JSI binding).
 */
class GliphPlayerPackage : TurboReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return when (name) {
      GliphPlayerModule.NAME -> GliphPlayerModule(reactContext)
      "DeviceInfoModule" -> DeviceInfoModule(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        GliphPlayerModule.NAME to ReactModuleInfo(
          GliphPlayerModule.NAME,
          GliphPlayerModule.NAME,
          false,  // canOverrideExistingModule
          false,  // needsEagerInit
          false,  // isCxxModule
          true    // isTurboModule
        ),
        "DeviceInfoModule" to ReactModuleInfo(
          "DeviceInfoModule",
          "DeviceInfoModule",
          false,
          false,
          false,
          false // Not a TurboModule yet
        )
      )
    }
  }
}
