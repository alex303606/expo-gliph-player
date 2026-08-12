# 🎵 expo-gliph-player

[![npm version](https://img.shields.io/npm/v/expo-gliph-player)](https://www.npmjs.com/package/expo-gliph-player)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fixed version of react-native-gliph-player with full Expo compatibility.** All iOS bridge fixes, Swift/Objective-C issues, and Android `autoSkipOnError` patches are pre-applied.

---

## 📦 Installation

```bash
npm install expo-gliph-player
# or
yarn add expo-gliph-player
```

### From GitHub (Alternative):

```bash
yarn add https://github.com
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

## 💻 Reactive State

Instead of manually fetching state, Gliph Player ships with powerful React Hooks. These hooks automatically re-render your components whenever the audio state changes.

### Play/Pause State:

```tsx
import { useIsPlaying } from 'expo-gliph-player';

const { playing } = useIsPlaying(); // Returns true or false
```

### Progress & Duration (in seconds):

```tsx
import { useProgress } from 'expo-gliph-player';

const { position, duration } = useProgress(500); // Updates every 500ms
```

### "Now Playing" Track Metadata:

```tsx
import { useActiveTrack } from 'expo-gliph-player';

const track = useActiveTrack(); // Contains url, title, artist, artwork
```

---

## 🎛️ Playback & Queue Controls

### Basic Controls

```tsx
await GliphPlayer.play();
await GliphPlayer.pause();
await GliphPlayer.stop();
```

### Navigation & Seeking

```tsx
await GliphPlayer.skipToNext();
await GliphPlayer.skipToPrevious();
await GliphPlayer.seekTo(60); // Jump to exactly 1 minute (in seconds)
await GliphPlayer.seekBy(15); // Jump forward 15 seconds (great for podcasts)
```

### Managing the Queue

You can dynamically add, remove, or reorder tracks while the audio is playing.

```tsx
// Add a track to the end of the queue
await GliphPlayer.add({
  id: 'new-song',
  url: 'https://example.com',
  title: 'Just Added',
  artist: 'User'
});

// Remove a specific track by ID
await GliphPlayer.remove('track-1');

// Stop playback and empty the queue entirely
await GliphPlayer.reset();
```

---

## 🔒 Lock Screen & Background Events

To ensure your lock screen and notification panel controls actually respond to user input, you must connect native remote events to the player engine.

### Inside Components (`useTrackPlayerEvents`)

```tsx
import { useTrackPlayerEvents, Event } from 'expo-gliph-player';
import GliphPlayer from 'expo-gliph-player';

export function PlaybackObserver() {
  useTrackPlayerEvents([
    Event.RemotePlay, 
    Event.RemotePause, 
    Event.RemoteNext, 
    Event.RemotePrevious
  ], (event) => {
    if (event.type === Event.RemotePlay) GliphPlayer.play();
    if (event.type === Event.RemotePause) GliphPlayer.pause();
    if (event.type === Event.RemoteNext) GliphPlayer.skipToNext();
    if (event.type === Event.RemotePrevious) GliphPlayer.skipToPrevious();
  });

  return null; // Headless component, acts as a layout listener
}
```

### Global Listeners (`GliphPlayer.addEventListener`)

To handle audio events even when your React UI components are unmounted, register global listeners inside your app root (`index.js` or `App.tsx` outside the component lifecycle):

```tsx
import GliphPlayer, { Event } from 'expo-gliph-player';

GliphPlayer.addEventListener(Event.RemotePlay, () => {
  GliphPlayer.play();
});

GliphPlayer.addEventListener(Event.RemotePause, () => {
  GliphPlayer.pause();
});
```

---

## 🚀 Full Implementation Example

Here is a production-ready, complete example split into the main entry file (`App.tsx`) and the user interface component (`MusicPlayer.tsx`).

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
      // 1. Android Notification Permission (API 33+)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
      }

      // 2. Setup the engine
      await GliphPlayer.setupPlayer({
        playBuffer: 0.5, // 0.5s buffer for zero-lag seeking
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
      });

      // 3. Define Lock Screen / Notification Controls
      await GliphPlayer.updateOptions({
        capabilities: [
          Capability.Play, Capability.Pause,
          Capability.SkipToNext, Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
      });

      // 4. Add tracks to queue
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
import GliphPlayer, { useIsPlaying, useProgress, useActiveTrack, RepeatMode } from 'expo-gliph-player';

export const MusicPlayer = () => {
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress(500);
  const track = useActiveTrack();
  const [repeatMode, setRepeatMode] = useState('off');

  const togglePlayback = async () => {
    if (playing) {
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
          <Text style={{ color: '#fff' }}>{playing ? 'PAUSE' : 'PLAY'}</Text>
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
