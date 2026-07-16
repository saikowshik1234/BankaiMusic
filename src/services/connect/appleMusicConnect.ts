/**
 * Apple Music connect — deep link only. Unlike Spotify/YouTube, Apple Music's
 * catalog + library API (MusicKit) requires a signed developer token minted
 * from an Apple Developer Program membership (a private key + team/key IDs),
 * and there's no first-party Expo module for native MusicKit — wiring it up
 * for real needs a custom native module this project doesn't have. So this
 * connector is honestly scoped to what works today without that: opening a
 * track/search in the real Apple Music app. Playlist import throws a clear
 * "not supported yet" error instead of pretending to work.
 */
import { Linking } from 'react-native';
import type { RemotePlaylist, RemoteTrack, ServiceConnector } from './types';

const NOT_SUPPORTED =
  'Apple Music playlist import needs a MusicKit developer token (Apple Developer Program membership + a native module) that this app doesn\'t have wired up yet. You can still open songs directly in Apple Music.';

async function connect(): Promise<boolean> {
  throw new Error(NOT_SUPPORTED);
}

export const appleMusicConnector: ServiceConnector = {
  service: 'appleMusic',
  displayName: 'Apple Music',
  supportsImport: false,
  connect,
  disconnect: () => {},
  isConnected: () => false,
  listPlaylists: (): Promise<RemotePlaylist[]> => Promise.reject(new Error(NOT_SUPPORTED)),
  listPlaylistTracks: (): Promise<RemoteTrack[]> => Promise.reject(new Error(NOT_SUPPORTED)),
};

/** Opens a search for the track in the real Apple Music app (falls back to the web). */
export async function openInAppleMusic(title: string, artist: string): Promise<void> {
  const term = encodeURIComponent(`${title} ${artist}`);
  try {
    await Linking.openURL(`music://music.apple.com/search?term=${term}`);
  } catch {
    await Linking.openURL(`https://music.apple.com/search?term=${term}`);
  }
}
