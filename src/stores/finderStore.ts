import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RecognizedSong } from '@/services/audio/recognitionService';

export interface IdentifiedTrack extends RecognizedSong {
  id: string; // unique ID for the history list
  identifiedAt: number; // timestamp
}

interface FinderState {
  history: IdentifiedTrack[];
  addIdentification: (song: RecognizedSong) => void;
  clearHistory: () => void;
}

const HISTORY_LIMIT = 20;

export const useFinderStore = create<FinderState>()(
  persist(
    (set) => ({
      history: [],
      
      addIdentification: (song) => {
        const entry: IdentifiedTrack = {
          ...song,
          id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
          identifiedAt: Date.now(),
        };
        
        set((state) => {
          // Prevent exact duplicates near the top of the history
          const existing = state.history.findIndex(
            (t) => t.title === song.title && t.artist === song.artist
          );
          
          let newHistory = [...state.history];
          if (existing !== -1) {
            newHistory.splice(existing, 1);
          }
          
          newHistory = [entry, ...newHistory].slice(0, HISTORY_LIMIT);
          return { history: newHistory };
        });
      },
      
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'bankaimusic-finder',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
