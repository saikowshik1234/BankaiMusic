/**
 * Two ways music enters the library:
 *
 * 1. scanDeviceAudio() — expo-media-library scan. Works on ANDROID (real
 *    builds). On iOS this API reads the Photos library, which contains no
 *    MP3s — files in the Files app are invisible to it (see CLAUDE.md
 *    gotchas). In Expo Go specifically, this module is a known trouble
 *    spot — Expo Go's own runtime warns that it "can no longer provide
 *    full access to the media library" — so every entry point here is
 *    guarded to skip straight past it there rather than risk a crash.
 *
 * 2. importAudioFiles() — expo-document-picker. The user picks audio files
 *    (Files app / Downloads); we COPY them into the app's documents folder
 *    so the library owns stable URIs. This is the primary path on iOS and
 *    the fallback on Android (and the only path that works in Expo Go).
 *
 * Permission is requested in-context, never on cold launch.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import type { LibraryPermission, Track } from '@/types';

/** Expo Go's shared binary doesn't reliably support this module's newer permission APIs. */
const IN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function requestAudioPermission(): Promise<LibraryPermission> {
  if (IN_EXPO_GO) return 'denied';
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function getAudioPermission(): Promise<LibraryPermission> {
  if (IN_EXPO_GO) return 'denied';
  try {
    const { status } = await MediaLibrary.getPermissionsAsync(false, ['audio']);
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Best-effort "Artist - Title" split from a bare filename. */
function parseFilename(filename: string): { title: string; artist: string } {
  const base = decodeURIComponent(filename).replace(/\.[^.]+$/, '');
  const parts = base.split(/\s*[-–]\s*/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { artist: parts[0], title: parts.slice(1).join(' - ') };
  }
  return { title: base, artist: 'Unknown artist' };
}

export async function scanDeviceAudio(): Promise<Track[]> {
  if (IN_EXPO_GO) return [];

  const tracks: Track[] = [];
  let cursor: MediaLibrary.AssetRef | undefined;
  let hasNext = true;

  while (hasNext) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after: cursor,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    for (const asset of page.assets) {
      const { title, artist } = parseFilename(asset.filename);
      tracks.push({
        id: asset.id,
        uri: asset.uri,
        title,
        artist,
        duration: asset.duration ?? 0,
        addedAt: asset.creationTime || Date.now(),
      });
    }

    hasNext = page.hasNextPage;
    cursor = page.endCursor;
  }

  return tracks;
}

const MUSIC_DIR = `${FileSystem.documentDirectory ?? ''}music/`;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i;

/**
 * Automatic local scan: the app's documents folder (visible in the iOS Files
 * app under "On My iPhone > VINYL" thanks to UIFileSharingEnabled) plus the
 * music/ subfolder where imports land. Runs on every launch — files the user
 * drops into the VINYL folder appear without any import step.
 */
export async function scanAppFolder(): Promise<Track[]> {
  const tracks: Track[] = [];
  const dirs = [FileSystem.documentDirectory ?? '', MUSIC_DIR];

  for (const dir of dirs) {
    if (!dir) continue;
    let names: string[] = [];
    try {
      names = await FileSystem.readDirectoryAsync(dir);
    } catch {
      continue; // dir may not exist yet
    }
    for (const name of names) {
      if (!AUDIO_EXT.test(name)) continue;
      const uri = `${dir}${name}`;
      let addedAt = Date.now();
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && info.modificationTime) addedAt = info.modificationTime * 1000;
      } catch {
        /* keep default */
      }
      // imports are prefixed with a timestamp — strip it for display
      const displayName = name.replace(/^\d{13}-/, '');
      const { title, artist } = parseFilename(displayName);
      tracks.push({
        id: `file-${name}`,
        uri,
        title,
        artist,
        duration: 0, // backfilled by the player on first spin
        addedAt,
      });
    }
  }

  return tracks;
}

async function ensureMusicDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MUSIC_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MUSIC_DIR, { intermediates: true });
  }
}

export async function importAudioFiles(): Promise<number> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return 0;

  await ensureMusicDir();
  let copied = 0;

  for (const asset of result.assets) {
    const safeName = asset.name.replace(/[^a-zA-Z0-9. _()-]/g, '_');
    const dest = `${MUSIC_DIR}${Date.now()}-${safeName}`;
    try {
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      copied += 1;
    } catch {
      // skip unreadable files, keep importing the rest
    }
  }

  return copied;
}
