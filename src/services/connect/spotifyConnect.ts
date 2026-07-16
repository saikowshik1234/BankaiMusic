/**
 * Spotify connect — OAuth (Authorization Code + PKCE, no client secret needed)
 * to read the user's OWN playlist metadata via the Spotify Web API, plus a
 * deep link that hands playback off to the real Spotify app. We never touch
 * Spotify's audio streams — CLAUDE.md forbids that, and Spotify's public API
 * doesn't expose them to third-party apps anyway.
 *
 * Client IDs for PKCE/native OAuth clients are designed to be public (that's
 * the point of PKCE — no secret exists), so this reads from an
 * EXPO_PUBLIC_ env var, Expo's built-in mechanism for values that are meant
 * to end up in the compiled client bundle. Put your own Client ID
 * (developer.spotify.com/dashboard, redirect URI `bankaimusic://connect/spotify`)
 * in a git-ignored `.env` as EXPO_PUBLIC_SPOTIFY_CLIENT_ID — see .env.example.
 */
import {
  AuthRequest,
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import type { RemotePlaylist, RemoteTrack, ServiceConnector } from './types';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const SCOPES = ['playlist-read-private', 'playlist-read-collaborative'];
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

let accessToken: string | null = null;
let expiresAt = 0;

function isConnected(): boolean {
  return !!accessToken && Date.now() < expiresAt;
}

async function connect(): Promise<boolean> {
  if (!CLIENT_ID) {
    throw new Error(
      "Spotify isn't configured yet — add your own Client ID to .env as EXPO_PUBLIC_SPOTIFY_CLIENT_ID (see developer.spotify.com/dashboard).",
    );
  }
  const redirectUri = makeRedirectUri({ scheme: 'bankaimusic', path: 'connect/spotify' });
  const request = new AuthRequest({
    clientId: CLIENT_ID,
    scopes: SCOPES,
    usePKCE: true,
    responseType: ResponseType.Code,
    redirectUri,
  });
  const result = await request.promptAsync(DISCOVERY);
  if (result.type !== 'success' || !result.params.code) return false;

  const token = await exchangeCodeAsync(
    {
      clientId: CLIENT_ID,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    DISCOVERY,
  );
  accessToken = token.accessToken;
  expiresAt = Date.now() + (token.expiresIn ?? 3600) * 1000;
  return true;
}

function disconnect(): void {
  accessToken = null;
  expiresAt = 0;
}

async function api<T>(path: string): Promise<T> {
  if (!isConnected()) throw new Error('Not connected to Spotify.');
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function listPlaylists(): Promise<RemotePlaylist[]> {
  const data = await api<{ items: { id: string; name: string; tracks: { total: number } }[] }>(
    '/me/playlists?limit=50',
  );
  return data.items.map((p) => ({ id: p.id, name: p.name, trackCount: p.tracks.total }));
}

interface SpotifyPlaylistTrackItem {
  track: { id: string; name: string; artists: { name: string }[] } | null;
}

async function listPlaylistTracks(playlistId: string): Promise<RemoteTrack[]> {
  // first page only (50 tracks) — pagination via the response's `next` URL is
  // left as a follow-up; most personal playlists fit in one page.
  const data = await api<{ items: SpotifyPlaylistTrackItem[] }>(
    `/playlists/${playlistId}/tracks?limit=50`,
  );
  return data.items
    .filter((i): i is { track: NonNullable<SpotifyPlaylistTrackItem['track']> } => !!i.track)
    .map((i) => ({
      id: i.track.id,
      title: i.track.name,
      artist: i.track.artists.map((a) => a.name).join(', '),
      openUri: `spotify:track:${i.track.id}`,
    }));
}

export const spotifyConnector: ServiceConnector = {
  service: 'spotify',
  displayName: 'Spotify',
  supportsImport: true,
  connect,
  disconnect,
  isConnected,
  listPlaylists,
  listPlaylistTracks,
};

/** Hands playback to the real Spotify app (falls back to the web player). */
export async function openInSpotify(track: RemoteTrack): Promise<void> {
  try {
    await Linking.openURL(track.openUri);
  } catch {
    await Linking.openURL(`https://open.spotify.com/track/${track.id}`);
  }
}
