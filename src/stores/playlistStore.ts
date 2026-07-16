/**
 * User-created playlists. Favourites live in playerStore (liked); these are
 * named collections the user builds by hand. Persisted like the other stores.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

interface PlaylistState {
  playlists: Playlist[];
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrack: (id: string, trackId: string) => void;
  removeTrack: (id: string, trackId: string) => void;
}

let counter = 0;
function makeId(): string {
  counter += 1;
  return `pl_${Date.now().toString(36)}_${counter}`;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set) => ({
      playlists: [],
      createPlaylist: (name) => {
        const id = makeId();
        const playlist: Playlist = {
          id,
          name: name.trim() || 'Untitled playlist',
          trackIds: [],
          createdAt: Date.now(),
        };
        set((s) => ({ playlists: [...s.playlists, playlist] }));
        return id;
      },
      renamePlaylist: (id, name) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),
      deletePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
      addTrack: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p,
          ),
        })),
      removeTrack: (id, trackId) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id ? { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) } : p,
          ),
        })),
    }),
    { name: 'vinyl-playlists', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
