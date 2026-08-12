# 🎵 expo-gliph-player

[![npm version](https://img.shields.io/npm/v/expo-gliph-player)](https://www.npmjs.com/package/expo-gliph-player)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fixed version of react-native-gliph-player with full Expo compatibility.**
A high-performance, New Architecture (JSI / TurboModules) compatible audio player for React Native. Built for developers who need absolute control over audio playback, background services, and system integration without fighting complex APIs.
---

## 📦 Installation

```bash
npm install expo-gliph-player
# or
yarn add expo-gliph-player
```

### From GitHub (Alternative):

```bash
yarn add https://github.com/alex303606/expo-gliph-player
```

---

## 🚀 Setup & Configuration

### 1. Configure `app.json`

Since this package contains native code, you must add the config plugin and configure background capabilities for iOS and Android:

```json
{
  "expo": {
    "plugins": ["expo-gliph-player"],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "permissions": ["android.permission.FOREGROUND_SERVICE"]
    }
  }
}
```

### 2. Build the App

This package uses native code. Run prebuild before launching the project:

```bash
npx expo prebuild
# then run on device/emulator
npx expo run:ios
# or
npx expo run:android
```
---

## 🚀 Full Implementation Example

Want to skip straight to the code? Here is a complete, production-ready implementation containing both the main app setup (`App.tsx`) and the user interface (`MusicPlayer.tsx`).

### 1. App.tsx (Main Entry & Background Engine Setup)

```tsx
import React, { useEffect } from 'react';
import { View, Platform, PermissionsAndroid } from 'react-native';
import GliphPlayer, { Capability, AppKilledPlaybackBehavior } from 'expo-gliph-player';
import { MusicPlayer } from './components/MusicPlayer';

const tracks = [
  {
    id: '1',
    url: 'https://example.com',
    title: 'Gliph Journey',
    artist: 'Gliph Labs',
    artwork: 'https://example.com',
  },
];

export default function App() {
  useEffect(() => {
    const setup = async () => {
      // Android Notification Permission (API 33+)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
      }

      await GliphPlayer.setupPlayer({
        playBuffer: 0.5, // 0.5s buffer for zero-lag seeking
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
      });

      await GliphPlayer.updateOptions({
        capabilities: [
          Capability.Play, Capability.Pause,
          Capability.SkipToNext, Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
      });

      await GliphPlayer.add(tracks);
    };

    setup();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <MusicPlayer />
    </View>
  );
}
```

### 2. MusicPlayer.tsx (UI Component)

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import GliphPlayer, { usePlaybackState, useProgress, useActiveTrack, State, RepeatMode } from 'expo-gliph-player';

export const MusicPlayer = () => {
    const { state } = usePlaybackState();
    const { position, duration } = useProgress(500);
    const track = useActiveTrack();
    const [repeatMode, setRepeatMode] = useState('off');

    const togglePlayback = async () => {
        if (state === State.Playing) {
            await GliphPlayer.pause();
        } else {
            await GliphPlayer.play();
        }
    };

    const cycleRepeat = async () => {
        const next = repeatMode === 'off' ? 'one' : repeatMode === 'one' ? 'all' : 'off';
        setRepeatMode(next);
        await GliphPlayer.setRepeatMode(
            next === 'one' ? RepeatMode.Track : next === 'all' ? RepeatMode.Queue : RepeatMode.Off
        );
    };

    return (
        <View style={styles.container}>
            <Image source={{ uri: track?.artwork }} style={styles.artwork} />
            <Text style={styles.title}>{track?.title || 'No Track'}</Text>

            <Slider
                style={{ width: '100%', height: 40 }}
                value={position}
                maximumValue={duration || 1}
                onSlidingComplete={(val) => GliphPlayer.seekTo(val)}
                minimumTrackTintColor="#1DB954"
            />

            <View style={styles.controls}>
                <TouchableOpacity onPress={() => GliphPlayer.skipToPrevious()}>
                    <Text style={styles.btn}>Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={togglePlayback} style={styles.playBtn}>
                    <Text style={{ color: '#fff' }}>{state === State.Playing ? 'PAUSE' : 'PLAY'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => GliphPlayer.skipToNext()}>
                    <Text style={styles.btn}>Next</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={cycleRepeat} style={{ marginTop: 20 }}>
                <Text style={{ color: '#1DB954' }}>Repeat: {repeatMode.toUpperCase()}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1 },
    artwork: { width: 300, height: 300, borderRadius: 10 },
    title: { color: '#fff', fontSize: 24, marginVertical: 20 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 40, marginTop: 20 },
    playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    btn: { color: '#fff', fontSize: 18 }
});
```
---

## 💻 Complete Integration

Let's put the pieces together. Using react-native-gliph-player requires two steps: initializing the background service, and then actually rendering your UI.

### Step 1: Setting up the Player

You should initialize the player as soon as your app mounts (usually in App.tsx). You configure the buffer size, define what buttons show on the lock screen, and add your initial tracks.

```tsx
import React, { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import GliphPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-gliph-player';

const myTracks = [
    {
        id: '1',
        url: 'https://example.com/audio.mp3',
        title: 'Awesome Song',
        artist: 'Gliph Labs',
        artwork: 'https://example.com/cover.jpg', // Shows on lock screen
    }
];

export default function App() {
    useEffect(() => {
        const initializeAudio = async () => {
            // 1. Request Android 13+ Notification Permission
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
            }

            // 2. Setup the engine
            await GliphPlayer.setupPlayer({
                playBuffer: 0.5, // 0.5s buffer for zero-lag seeking
                android: {
                    // Keep playing even if user swipes app away
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                },
            });

            // 3. Define Lock Screen Controls
            await GliphPlayer.updateOptions({
                capabilities: [
                    Capability.Play, Capability.Pause,
                    Capability.SkipToNext, Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
            });

            // 4. Add tracks to queue
            await GliphPlayer.add(myTracks);
        };

        initializeAudio();
    }, []);

    return <YourMainUI />;
}
```
---

## 🔧 Controlling Playback

Now that the player is initialized, you can control it from anywhere in your app using the GliphPlayer API.

### Basic Controls

Building play, pause, next, and previous buttons is straightforward. All commands are async promises.

```tsx
import GliphPlayer from 'react-native-gliph-player';
import { TouchableOpacity, Text, View } from 'react-native';

export function PlayerControls() {
    return (
        <View style={{ flexDirection: 'row', gap: 20 }}>
            <TouchableOpacity onPress={() => GliphPlayer.skipToPrevious()}>
                <Text>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => GliphPlayer.play()}>
                <Text>Play</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => GliphPlayer.pause()}>
                <Text>Pause</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => GliphPlayer.skipToNext()}>
                <Text>Next</Text>
            </TouchableOpacity>
        </View>
    );
}
```

### Seeking and Jumping

You can seek to a specific second, or jump forward/backward by an offset.

```tsx
// Jump to exactly 1 minute in
<TouchableOpacity onPress={() => GliphPlayer.seekTo(60)}>
    <Text>Go to 1:00</Text>
</TouchableOpacity>

// Jump forward 15 seconds (great for podcasts)
<TouchableOpacity onPress={() => GliphPlayer.seekBy(15)}>
    <Text>+15s</Text>
</TouchableOpacity>
```

### Seeking and Jumping

You can seek to a specific second, or jump forward/backward by an offset.

```tsx
// Jump to exactly 1 minute in
<TouchableOpacity onPress={() => GliphPlayer.seekTo(60)}>
  <Text>Go to 1:00</Text>
</TouchableOpacity>

// Jump forward 15 seconds (great for podcasts)
<TouchableOpacity onPress={() => GliphPlayer.seekBy(15)}>
  <Text>+15s</Text>
</TouchableOpacity>
```

## Managing the Queue

You can dynamically add, remove, or reorder tracks while the audio is playing.

```tsx
// Add a track to the end of the queue
await GliphPlayer.add({
  id: 'new-song',
  url: 'https://example.com/new.mp3',
  title: 'Just Added',
  artist: 'User'
});

// Remove a specific track
await GliphPlayer.remove('track-1');

// Stop playback and empty the queue entirely
await GliphPlayer.reset();
```

---

## 🎛️ Reactive State

Instead of manually fetching state, Gliph Player ships with powerful React Hooks. These hooks automatically re-render your components whenever the audio state changes.

### Building a Play/Pause Button

The useIsPlaying() hook makes it incredibly easy to toggle a play/pause icon.

```tsx
import GliphPlayer, { useIsPlaying } from 'react-native-gliph-player';
import { TouchableOpacity, Text } from 'react-native';

export function PlayPauseButton() {
    const { playing } = useIsPlaying();

    const toggle = async () => {
        if (playing) {
            await GliphPlayer.pause();
        } else {
            await GliphPlayer.play();
        }
    };

    return (
        <TouchableOpacity onPress={toggle} style={{ padding: 20, backgroundColor: '#333' }}>
            <Text style={{ color: '#fff' }}>{playing ? 'PAUSE' : 'PLAY'}</Text>
        </TouchableOpacity>
    );
}
```

### Building a Progress Slider

The useProgress() hook returns the current position and duration. It updates automatically so your slider moves smoothly in real-time.

```tsx
import GliphPlayer, { useProgress } from 'react-native-gliph-player';
import Slider from '@react-native-community/slider';

export function ProgressBar() {
    // Updates 2 times a second (500ms)
    const { position, duration } = useProgress(500);

    return (
        <Slider
            style={{ width: '100%', height: 40 }}
            value={position}
            maximumValue={duration || 1}
            onSlidingComplete={(value) => GliphPlayer.seekTo(value)}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#ffffff"
        />
    );
}
```

### Showing "Now Playing"

The useActiveTrack() hook returns the data for the song currently playing. It changes automatically when a song skips.

```tsx
import { useActiveTrack } from 'react-native-gliph-player';
import { View, Image, Text } from 'react-native';

export function NowPlaying() {
    const track = useActiveTrack();

    if (!track) return <Text>Nothing playing</Text>;

    return (
        <View style={{ alignItems: 'center' }}>
            <Image source={{ uri: track.artwork }} style={{ width: 200, height: 200 }} />
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{track.title}</Text>
            <Text style={{ fontSize: 18, color: 'gray' }}>{track.artist}</Text>
        </View>
    );
}
```

---

## 🔒 Background & Lock Screen

One of the biggest advantages of Gliph Player is that audio keeps playing when the app is minimized. The system lock screen and notification panel will show your track artwork and controls automatically.

### Lock Screen Buttons
The native OS provides the lock screen controls, but you need to tell Gliph Player how to respond when a user taps "Next" on their lock screen. If you don't listen for these events, the lock screen buttons won't do anything!
We provide a special hook `useTrackPlayerEvents` to capture these native remote events cleanly inside your components.

```tsx
import { useTrackPlayerEvents, Event } from 'expo-gliph-player';
import GliphPlayer from 'expo-gliph-player';

export function PlaybackObserver() {
  // Listen for native remote control events
  useTrackPlayerEvents([
    Event.RemotePlay, 
    Event.RemotePause, 
    Event.RemoteNext, 
    Event.RemotePrevious
  ], (event) => {
    if (event.type === Event.RemotePlay) {
      GliphPlayer.play();
    }
    
    if (event.type === Event.RemotePause) {
      GliphPlayer.pause();
    }
    
    if (event.type === Event.RemoteNext) {
      GliphPlayer.skipToNext();
    }
    
    if (event.type === Event.RemotePrevious) {
      GliphPlayer.skipToPrevious();
    }
  });

  // This component doesn't need to render anything visual
  return null;
}
```

### Background Services (Advanced)
If you want to handle events globally even when your React UI is completely unmounted, you can register listeners outside of the component tree (e.g. in your `index.js` or `App.tsx` file outside the component lifecycle) using `GliphPlayer.addEventListener()`.

```tsx
import GliphPlayer, { Event } from 'expo-gliph-player';

// In index.js or App.tsx (outside component)
GliphPlayer.addEventListener(Event.RemotePlay, () => {
  GliphPlayer.play();
});

GliphPlayer.addEventListener(Event.RemotePause, () => {
  GliphPlayer.pause();
});
```

---

## 🔧 What's Fixed

### iOS:
- ✅ Fixed Swift/Objective-C bridging with `GliphAudioPlayer.h`.
- ✅ Removed ReactCodegen dependency (no more build errors).
- ✅ Fixed `use_frameworks!` compatibility.
- ✅ Correct Swift module generation.

### Android:
- ✅ Fixed `autoSkipOnError` crash (`NoSuchKeyException`).
- ✅ Proper foreground service registration.
- ✅ `MainApplication.kt` autolinking.

---

## 📋 Requirements

- **Expo SDK:** 50+
- **React Native:** 0.71+
- **iOS:** 14.0+
- **Android:** API 21+

---

## 📄 License

MIT

---

## 🙏 Credits

Based on [react-native-gliph-player](https://github.com) by Gliph Labs.
