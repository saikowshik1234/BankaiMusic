import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  getAudioPermission,
  importAudioFiles,
  requestAudioPermission,
  scanAppFolder,
  scanDeviceAudio,
} from '@/services/audio/libraryScanner';
import type { LibraryPermission, SortMode, Track } from '@/types';

interface LibraryState {
  tracks: Track[];
  permission: LibraryPermission;
  isScanning: boolean;
  sortMode: SortMode;
  searchQuery: string;

  checkPermission: () => Promise<void>;
  requestAndScan: () => Promise<void>;
  rescan: () => Promise<void>;
  /** document-picker import — fallback when auto-detection can't reach a file */
  importFiles: () => Promise<number>;
  /** launch-time refresh: permission check + full rescan */
  autoRefresh: () => Promise<void>;
  setTrackDuration: (id: string, duration: number) => void;
  setSortMode: (mode: SortMode) => void;
  setSearchQuery: (query: string) => void;
}

/**
 * Pure helper — call from components inside useMemo.
 * NEVER call array-building functions inside a zustand selector: the fresh
 * array reference on every snapshot causes an infinite re-render loop
 * (React "getSnapshot should be cached" error).
 */
export function selectVisibleTracks(
  tracks: Track[],
  sortMode: SortMode,
  searchQuery: string,
): Track[] {
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query),
      )
    : tracks;

  switch (sortMode) {
    case 'title':
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    case 'artist':
      return [...filtered].sort((a, b) => a.artist.localeCompare(b.artist));
    case 'recent':
    default:
      return [...filtered].sort((a, b) => b.addedAt - a.addedAt);
  }
}

/** merge, dedupe by id, keep existing entries (their durations may be backfilled) */
function mergeTracks(existing: Track[], incoming: Track[]): Track[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const t of incoming) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  return [...byId.values()];
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      tracks: [],
      permission: 'unknown',
      isScanning: false,
      sortMode: 'recent',
      searchQuery: '',

      checkPermission: async () => {
        set({ permission: await getAudioPermission() });
      },

      requestAndScan: async () => {
        const permission = await requestAudioPermission();
        set({ permission });
        if (permission === 'granted') await get().rescan();
      },

      rescan: async () => {
        if (get().isScanning) return;
        set({ isScanning: true });
        try {
          // app folder is ALWAYS scanned — no permission needed
          const local = await scanAppFolder();
          // device-wide scan where the platform allows it (Android)
          let device: Track[] = [];
          if (get().permission === 'granted') {
            try {
              device = await scanDeviceAudio();
            } catch {
              device = [];
            }
          }
          // durations already learned are kept by merge (existing wins)
          const known = get().tracks.filter(
            (t) => local.some((n) => n.id === t.id) || device.some((n) => n.id === t.id),
          );
          set({ tracks: mergeTracks(known, [...local, ...device]) });
        } finally {
          set({ isScanning: false });
        }
      },

      /** launch-time refresh: check permission, then pick up everything */
      autoRefresh: async () => {
        await get().checkPermission();
        await get().rescan();
      },

      importFiles: async () => {
        const copied = await importAudioFiles();
        if (copied > 0) await get().rescan();
        return copied;
      },

      setTrackDuration: (id, duration) => {
        if (duration <= 0) return;
        const { tracks } = get();
        const idx = tracks.findIndex((t) => t.id === id);
        const track = tracks[idx];
        if (!track || Math.abs(track.duration - duration) < 1) return;
        const next = [...tracks];
        next[idx] = { ...track, duration };
        set({ tracks: next });
      },

      setSortMode: (sortMode) => set({ sortMode }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'vinyl-library',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tracks: s.tracks, sortMode: s.sortMode }),
    },
  ),
);
