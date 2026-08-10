const {
    withDangerousMod,
    withPodfile,
    withInfoPlist,
    withAndroidManifest,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withGliphPlayer(config) {
    console.log('🔧 Starting expo-gliph-player plugin...');

    // ===== iOS: Info.plist =====
    config = withInfoPlist(config, (config) => {
        if (!config.modResults.UIBackgroundModes) {
            config.modResults.UIBackgroundModes = [];
        }
        if (!config.modResults.UIBackgroundModes.includes('audio')) {
            config.modResults.UIBackgroundModes.push('audio');
        }
        return config;
    });

    // ===== iOS: Podfile =====
    config = withPodfile(config, (config) => {
        let content = config.modResults.contents;

        if (!content.includes("pod 'expo-gliph-player'")) {
            const podLine =
                `  pod 'expo-gliph-player', :path => '../node_modules/expo-gliph-player', :build_type => :static_framework`;

            // Use the real host app target name instead of a hardcoded one, so
            // this plugin works in any Expo project, not just the app it was
            // originally extracted from.
            const targetName = config.modRequest?.projectName;
            const namedTargetRegex = targetName
                ? new RegExp(`target '${targetName}' do`)
                : null;

            if (namedTargetRegex && namedTargetRegex.test(content)) {
                content = content.replace(namedTargetRegex, (match) => `${match}\n${podLine}`);
            } else {
                // Fallback: insert into the first `target '...' do` block, which
                // is always the main app target in a standard Expo-generated Podfile.
                content = content.replace(/target '([^']+)' do/, (match) => `${match}\n${podLine}`);
            }
        }

        if (!content.includes("target.name == 'expo-gliph-player'")) {
            const gliphConfig = `
    # Configure expo-gliph-player
    installer.pods_project.targets.each do |target|
      if target.name == 'expo-gliph-player'
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
          config.build_settings['SWIFT_INSTALL_OBJC_HEADER'] = 'YES'
          config.build_settings['SWIFT_OBJC_INTERFACE_HEADER_NAME'] = 'expo_gliph_player-Swift.h'
          config.build_settings['SWIFT_VERSION'] = '5.9'
          # RCT_NEW_ARCH_ENABLED is intentionally left alone here — it should
          # come from the host app's actual architecture setting via Expo/RN
          # autolinking, not be forced on unconditionally (see podspec).
        end
      end
    end`;

            content = content.replace(
                /post_install do \|installer\|/,
                `post_install do |installer|${gliphConfig}`
            );
        }

        config.modResults.contents = content;
        return config;
    });

    // ===== Android: AndroidManifest.xml =====
    config = withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const application = manifest.manifest?.application?.[0];
        if (!application) return config;

        if (!application.service) application.service = [];

        const hasService = application.service.some(
            (s) => s.$?.['android:name'] === 'com.gliphplayer.GliphPlayerService',
        );

        if (!hasService) {
            const serviceData = {
                $: {
                    'android:name': 'com.gliphplayer.GliphPlayerService',
                    'android:exported': 'true',
                    'android:foregroundServiceType': 'mediaPlayback',
                    'android:stopWithTask': 'false',
                },
                'intent-filter': [{
                    action: [
                        { $: { 'android:name': 'androidx.media3.session.MediaLibraryService' } },
                        { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
                    ],
                }],
            };
            application.service.push(serviceData);
        }
        return config;
    });

    // ===== Android: MainApplication.kt =====
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            // Derive the path from the project's real Android package name instead
            // of guessing against a hardcoded list of paths from one specific app.
            const pkg = config.android?.package;
            if (!pkg) {
                console.warn(
                    "[expo-gliph-player] Couldn't determine the Android package name " +
                    '(config.android.package is missing) — skipping MainApplication.kt patch. ' +
                    'Set "android.package" in app.json/app.config.js.'
                );
                return config;
            }

            const pkgPath = pkg.replace(/\./g, '/');
            const mainAppPath = path.join(
                config.modRequest.projectRoot,
                `android/app/src/main/java/${pkgPath}/MainApplication.kt`
            );

            if (fs.existsSync(mainAppPath)) {
                let content = fs.readFileSync(mainAppPath, 'utf8');

                if (!content.includes('import com.gliphplayer.GliphPlayerPackage')) {
                    const lines = content.split('\n');
                    let lastImportIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].trim().startsWith('import ')) {
                            lastImportIndex = i;
                        }
                    }
                    if (lastImportIndex !== -1) {
                        lines.splice(lastImportIndex + 1, 0, 'import com.gliphplayer.GliphPlayerPackage');
                        content = lines.join('\n');
                    }
                }

                if (!content.includes('add(GliphPlayerPackage())')) {
                    const applyRegex = /PackageList\(this\)\.packages\.apply\s*\{/;
                    if (applyRegex.test(content)) {
                        content = content.replace(
                            applyRegex,
                            (match) => `${match}\n          add(GliphPlayerPackage())`
                        );
                    }
                }

                fs.writeFileSync(mainAppPath, content, 'utf8');
            } else {
                console.warn(`[expo-gliph-player] MainApplication.kt not found at ${mainAppPath} — skipping patch.`);
            }
            return config;
        },
    ]);

    return config;
};