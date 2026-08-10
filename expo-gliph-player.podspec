require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "expo-gliph-player"
  s.version      = package["version"]
  s.summary      = "Fixed version of react-native-gliph-player with Expo compatibility"
  s.homepage     = "https://github.com/alex303606/expo-gliph-player"
  s.license      = "MIT"
  s.authors      = { "alex303606" => "alex303606@gmail.com" }

  s.platforms    = { :ios => "14.0" }
  s.source       = { :git => "https://github.com/alex303606/expo-gliph-player.git", :tag => "#{s.version}" }

  # Required because this pod contains Swift. Xcode's generated Swift-ObjC
  # interop header (expo_gliph_player-Swift.h) self-imports
  # <expo_gliph_player/expo_gliph_player.h> — an import that only resolves
  # against a real .framework bundle's own Headers/ folder. Without this,
  # CocoaPods may still build the pod as a plain static library (with the
  # legacy flat Headers/Public/<pod-name>/ layout) even when the host app
  # has `use_frameworks! :linkage => :static` set globally, and the build
  # fails with "'expo_gliph_player/expo_gliph_player.h' file not found".
  s.static_framework = true

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.requires_arc = true

  # Only expose GliphAudioPlayer.h + expo_gliph_player.h as *public* headers.
  # DEFINES_MODULE makes Xcode build a single Clang module out of every
  # public header, in one consistent language mode. GliphPlayerModule.h
  # transitively pulls in RNGliphPlayerSpec -> ReactCodegen -> Nitro Modules'
  # headers, which require Objective-C++ — mixing that into the module
  # umbrella causes "Could not build Objective-C module 'expo_gliph_player'" /
  # "Could not build module 'ReactCodegen'" / "must be compiled as
  # Obj-C++" / "'utility' file not found". Keeping it (and the bridging
  # header) private avoids pulling that chain into the module build;
  # GliphPlayerModule.mm still sees it fine via a plain quoted #import
  # since it's compiled as part of the same target either way.
  #
  # expo_gliph_player.h is a small master header matching the module's
  # name (dashes -> underscores). Xcode's Swift-generated interop header
  # (expo_gliph_player-Swift.h) hardcodes an import of
  # <expo_gliph_player/expo_gliph_player.h> for any Swift-containing module
  # with DEFINES_MODULE = YES — without a public header with exactly that
  # name, the build fails with "file not found" on that import.
  # Expo's own autolinking post_install step force-disables framework builds
  # for nearly all pods in the project (including this one) when
  # EXPO_USE_PRECOMPILED_MODULES is enabled — it runs *after* CocoaPods
  # applies static_framework/:build_type, so this pod always ends up built
  # as a plain static library with the legacy flat "Headers/Public/<name>/"
  # layout, never as a real .framework. In that layout, CocoaPods names the
  # folder after `s.name` (expo-gliph-player, with a dash) by default, but
  # Xcode's Swift-generated interop header self-imports
  # <expo_gliph_player/expo_gliph_player.h> (module name, with an
  # underscore) — a folder name mismatch that "file not found"s regardless
  # of static_framework. header_dir renames that folder to match.
  s.header_dir = "expo_gliph_player"

  s.public_header_files = "ios/GliphAudioPlayer.h", "ios/expo_gliph_player.h"
  s.private_header_files = "ios/GliphPlayerModule.h", "ios/GliphPlayer-Bridging-Header.h"

  install_modules_dependencies(s)

  s.frameworks = [
    "AVFoundation",
    "MediaPlayer",
    "AudioToolbox",
    "UIKit"
  ]

  s.pod_target_xcconfig = {
    "SWIFT_VERSION" => "5.9",
    "DEFINES_MODULE" => "YES",
    "SWIFT_INSTALL_OBJC_HEADER" => "YES",
    "SWIFT_OBJC_INTERFACE_HEADER_NAME" => "expo_gliph_player-Swift.h",
    # RCT_NEW_ARCH_ENABLED is intentionally NOT forced here — Expo/RN
    # autolinking already defines it project-wide based on whether the
    # host app actually has the new architecture enabled. Hardcoding it
    # to 1 makes this pod always compile the TurboModule codepath even
    # when the host app runs the old (bridge) architecture, which can
    # fail to build or crash at runtime if old-arch codegen wasn't run.
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited)",
    "OTHER_SWIFT_FLAGS" => "$(inherited)"
  }

  s.xcconfig = {
    "OTHER_SWIFT_FLAGS" => "$(inherited)",
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited)"
  }
end