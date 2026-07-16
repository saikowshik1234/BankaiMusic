/**
 * Song recognition ("what's this song") — ships a short recorded clip to a
 * small Cloudflare Worker proxy (server/identify-proxy/), which attaches
 * the real AudD (audd.io) token server-side and forwards the request. The
 * app itself never holds the AudD token — env vars alone only keep secrets
 * out of git, not out of a compiled client bundle, and AudD's token is
 * billed/rate-limited per account. This is the one feature in the app that
 * needs network access: there is no offline fingerprint database that
 * could plausibly cover arbitrary commercial music.
 *
 * Recording itself happens in app/identify.tsx via expo-audio's
 * `useAudioRecorder` hook (the `AudioRecorder` class is a type-only export
 * from expo-audio — it isn't constructible directly outside that hook).
 * This module only owns the "send the clip, parse the match" half.
 *
 * Requires EXPO_PUBLIC_IDENTIFY_PROXY_URL + EXPO_PUBLIC_IDENTIFY_PROXY_KEY
 * in .env — see .env.example and server/identify-proxy/README.md.
 */
const PROXY_URL = process.env.EXPO_PUBLIC_IDENTIFY_PROXY_URL ?? '';
const PROXY_KEY = process.env.EXPO_PUBLIC_IDENTIFY_PROXY_KEY ?? '';

export interface RecognizedSong {
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

interface AuddResponse {
  status: 'success' | 'error';
  result: {
    title: string;
    artist: string;
    album?: string;
    release_date?: string;
    spotify?: { external_urls?: { spotify?: string } };
    apple_music?: { url?: string };
  } | null;
  error?: { error_message?: string };
}

export function isRecognitionConfigured(): boolean {
  return !!PROXY_URL && !!PROXY_KEY;
}

/** Uploads a recorded clip (local file uri) to the identify proxy and resolves with a match, or null. */
export async function identifyClip(uri: string): Promise<RecognizedSong | null> {
  if (!isRecognitionConfigured()) {
    throw new Error(
      "Song ID isn't configured yet — deploy server/identify-proxy (see its README) and add EXPO_PUBLIC_IDENTIFY_PROXY_URL / EXPO_PUBLIC_IDENTIFY_PROXY_KEY to .env.",
    );
  }

  const form = new FormData();
  // RN's fetch/FormData accepts this { uri, name, type } shape for file uploads
  form.append('file', { uri, name: 'clip.m4a', type: 'audio/m4a' } as unknown as Blob);

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'x-turntable-key': PROXY_KEY },
    body: form,
  });
  if (!res.ok) throw new Error(`Song ID service error (${res.status}).`);
  const data = (await res.json()) as AuddResponse;

  if (data.status === 'error') {
    throw new Error(data.error?.error_message ?? 'Song ID service returned an error.');
  }
  if (!data.result) return null;

  return {
    title: data.result.title,
    artist: data.result.artist,
    album: data.result.album,
    releaseDate: data.result.release_date,
    spotifyUrl: data.result.spotify?.external_urls?.spotify,
    appleMusicUrl: data.result.apple_music?.url,
  };
}
