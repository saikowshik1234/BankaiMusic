/**
 * YouTube Music connect — Google OAuth (PKCE) to read the user's OWN
 * playlists via the YouTube Data API v3, plus a deep link that opens the
 * track in the real YouTube Music app/site. No audio is extracted.
 *
 * Caveat: YouTube playlist items don't have a structured "artist" field like
 * Spotify — we fall back to the video's channel title, which is often but
 * not always the artist name (e.g. a label channel). Matching against the
 * local library will be less reliable here than for Spotify.
 *
 * Requires the user's own Google OAuth Client ID (console.cloud.google.com,
 * an "iOS" or "Android" client type so PKCE doesn't need a client secret;
 * redirect URI `bankaimusic://connect/youtubeMusic`), with the YouTube Data
 * API v3 enabled. Like Spotify, this is a public PKCE client ID (no secret
 * exists), so it's read from an EXPO_PUBLIC_ env var — put it in a
 * git-ignored `.env` as EXPO_PUBLIC_GOOGLE_CLIENT_ID — see .env.example.
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

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

let accessToken: string | null = null;
let expiresAt = 0;

function isConnected(): boolean {
  return !!accessToken && Date.now() < expiresAt;
}

async function connect(): Promise<boolean> {
  if (!CLIENT_ID) {
    throw new Error(
      "YouTube Music isn't configured yet — add your own OAuth Client ID to .env as EXPO_PUBLIC_GOOGLE_CLIENT_ID (see console.cloud.google.com).",
    );
  }
  const redirectUri = makeRedirectUri({ scheme: 'bankaimusic', path: 'connect/youtubeMusic' });
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
  if (!isConnected()) throw new Error('Not connected to YouTube Music.');
  const res = await fetch(`https://www.googleapis.com/youtube/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function listPlaylists(): Promise<RemotePlaylist[]> {
  const data = await api<{
    items: { id: string; snippet: { title: string }; contentDetails: { itemCount: number } }[];
  }>('/playlists?part=snippet,contentDetails&mine=true&maxResults=50');
  return data.items.map((p) => ({ id: p.id, name: p.snippet.title, trackCount: p.contentDetails.itemCount }));
}

interface YouTubePlaylistItem {
  snippet: { title: string; videoOwnerChannelTitle?: string; channelTitle: string; resourceId: { videoId: string } };
}

async function listPlaylistTracks(playlistId: string): Promise<RemoteTrack[]> {
  const data = await api<{ items: YouTubePlaylistItem[] }>(
    `/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50`,
  );
  return data.items.map((i) => ({
    id: i.snippet.resourceId.videoId,
    title: i.snippet.title,
    artist: i.snippet.videoOwnerChannelTitle ?? i.snippet.channelTitle,
    openUri: `https://music.youtube.com/watch?v=${i.snippet.resourceId.videoId}`,
  }));
}

export const youtubeMusicConnector: ServiceConnector = {
  service: 'youtubeMusic',
  displayName: 'YouTube Music',
  supportsImport: true,
  connect,
  disconnect,
  isConnected,
  listPlaylists,
  listPlaylistTracks,
};

/** Opens the track in YouTube Music (app if installed, else the web player). */
export async function openInYouTubeMusic(track: RemoteTrack): Promise<void> {
  await Linking.openURL(track.openUri);
}
