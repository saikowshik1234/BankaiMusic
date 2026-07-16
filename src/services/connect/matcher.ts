import type { Track } from '@/types';
import type { RemoteTrack } from './types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '') // drop "(remaster)" / "[live]" qualifiers
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MatchResult {
  remote: RemoteTrack;
  local?: Track;
}

/** Matches imported playlist metadata against the local library by normalized title + artist. */
export function matchRemoteTracks(remoteTracks: RemoteTrack[], localTracks: Track[]): MatchResult[] {
  const byKey = new Map<string, Track>();
  for (const t of localTracks) {
    byKey.set(`${normalize(t.title)}::${normalize(t.artist)}`, t);
  }
  return remoteTracks.map((remote) => ({
    remote,
    local: byKey.get(`${normalize(remote.title)}::${normalize(remote.artist)}`),
  }));
}
