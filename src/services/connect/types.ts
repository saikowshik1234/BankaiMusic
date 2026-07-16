/**
 * Streaming connect — official remote-control + playlist metadata import
 * ONLY (CLAUDE.md: no audio extraction, no DRM circumvention). Connecting a
 * service never streams its audio into this app; it either opens that
 * service's own app to play the track, or imports track/artist NAMES so we
 * can match them against the user's local library.
 */
export type ConnectService = 'spotify' | 'appleMusic' | 'youtubeMusic';

export interface RemoteTrack {
  id: string;
  title: string;
  artist: string;
  /** deep link that hands playback off to the service's own app */
  openUri: string;
}

export interface RemotePlaylist {
  id: string;
  name: string;
  trackCount: number;
}

export interface ServiceConnector {
  service: ConnectService;
  displayName: string;
  /** true if this connector can do more than open a deep link (has OAuth + a metadata API wired up) */
  supportsImport: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  isConnected: () => boolean;
  listPlaylists: () => Promise<RemotePlaylist[]>;
  listPlaylistTracks: (playlistId: string) => Promise<RemoteTrack[]>;
}
