# BankaiMusic

An offline music player for iOS and Android that plays the audio files already on your device. Built with Expo and React Native, BankaiMusic features a stunning interface with three-dimensional and skeuomorphic elements: a turntable you scrub by hand, a coverflow library, and an Earth-and-Moon scene that moves with playback.

Unleash the final form of your music experience — Bankai! 🎵⚔️

## What it does

- Plays local audio. On Android it scans the device media library; on iOS it imports files through the document picker and copies them into the app's own storage for stable playback.
- Now Playing is a 2.5D turntable assembled from React Native views, SVG, and gradients rather than a game engine. You scrub the record and move the tonearm by gesture, and every gesture has a plain-button equivalent.
- The library is a vertical coverflow list. Rows scale, fade, and tilt based on their distance from the center as you scroll, with a haptic tick each time a row crosses the middle.
- A third screen renders a low-poly Earth and Moon. When idle you can spin it, zoom it, and reset it by double-tap. During playback it rocks and pulses to a beat envelope. There are no bars or labels; the model itself is the visualizer.
- Song ID captures a few seconds of microphone audio and identifies what's playing nearby. This is the one feature that needs a network connection.
- Streaming Connect imports playlist track names from Spotify or YouTube Music and matches them against your local library. Anything not already on your device deep-links out to that service's own app. BankaiMusic never downloads or streams third-party audio itself.
- Haptics, transport sound effects, and a dark mode.

## Stack

- Expo SDK 54 (managed workflow), React Native 0.81, React 19, the New Architecture
- TypeScript in strict mode
- expo-router for navigation (three tabs, with Settings, Onboarding, Connect, and Song ID as slide-up modals)
- react-native-reanimated 4, react-native-worklets, and react-native-gesture-handler for gestures and animation on the UI thread
- three.js with @react-three/fiber for the Earth-and-Moon scene; react-native-svg and expo-linear-gradient for the turntable
- expo-audio for playback and microphone capture; expo-media-library for scanning device audio
- zustand for state, persisted with AsyncStorage
- Fonts from @expo-google-fonts (Sora, Manrope, IBM Plex Mono)

## Getting started

You need Node, the Expo tooling, and either a physical device with Expo Go or a platform simulator.

```bash
git clone https://github.com/YourUsername/BankaiMusic.git
cd BankaiMusic
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` / `i` to open an Android or iOS simulator. The device-wide media scan and Song ID recording need a development or production build rather than Expo Go; importing files and the app-folder scan work in Expo Go.

Type checking is part of the workflow:

```bash
npx tsc --noEmit
```

## Configuration

Streaming Connect and Song ID need credentials. Copy the example file and fill in your own:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_CLIENT_ID` are OAuth client IDs for playlist import. Both use Authorization Code with PKCE, so there is no client secret. Register the redirect URIs `bankaimusic://connect/spotify` and `bankaimusic://connect/youtubeMusic`. The Google client must be an iOS or Android OAuth client type, not Web.
- `EXPO_PUBLIC_IDENTIFY_PROXY_URL` and `EXPO_PUBLIC_IDENTIFY_PROXY_KEY` point at a small Cloudflare Worker that holds the AudD token server-side. See `server/identify-proxy/README.md` to deploy it.

The app runs without any of these; the features that depend on them surface a readable error instead of failing silently. The `EXPO_PUBLIC_` prefix compiles these values into the client bundle, which is appropriate here because none of them is a secret. The AudD token, which is billed, stays on the Worker and never ships in the app.

## Building

Production builds go through EAS:

```bash
eas build --platform all
```

This needs a free Expo account. iOS store submission additionally requires a paid Apple Developer account; Android requires a one-time Google Play registration fee.

## Project structure

```
app/                     expo-router routes
  (tabs)/index.tsx       Now Playing (the turntable)
  (tabs)/library.tsx     Library (coverflow list + search + import)
  (tabs)/profile.tsx     Visual (the Earth-and-Moon scene)
  settings.tsx           Settings (modal)
  onboarding.tsx         Onboarding (modal)
  connect.tsx            Streaming Connect (modal)
  identify.tsx           Song ID (modal)
src/
  theme/                 design tokens
  components/            shared UI, including the coverflow list
  turntable/             the 2.5D turntable device
  three/                 the Earth-and-Moon scene and the Now Playing visualizer
  services/audio/        playback engine, media scanner, Song ID client
  services/connect/      Spotify, YouTube Music, and Apple Music connectors
  stores/                zustand stores
  types/                 shared types
server/
  identify-proxy/        Cloudflare Worker for Song ID
assets/
  models/earth-moon.glb  the visualizer model
  sounds/                transport and interaction sounds
```

## A note on scope

BankaiMusic plays files you already own. It has no DRM circumvention and no path that downloads or streams audio from Spotify, Apple Music, or YouTube. The streaming integrations are limited to reading your own playlists' metadata and handing playback off to those apps, which is what their public APIs allow. Apple Music is deep-link only.

## License

MIT License — feel free to use, modify, and distribute.
