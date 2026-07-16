export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album?: string;
  /** seconds; may be re-read on load (Android media-library can return null) */
  duration: number;
  artworkUri?: string;
  addedAt: number;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export type RepeatMode = 'off' | 'all' | 'one';

export type SortMode = 'recent' | 'title' | 'artist';

export type LibraryPermission = 'unknown' | 'granted' | 'denied';
