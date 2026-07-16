/**
 * Playback state. Components dispatch here; this store drives audioService.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useLibraryStore } from '@/stores/libraryStore';
import { audioService } from '@/services/audio/audioService';
import { soundService } from '@/services/audio/soundService';
import type { PlaybackStatus, RepeatMode, Track } from '@/types';

const HISTORY_LIMIT = 20;

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  status: PlaybackStatus;
  positionSec: number;
  durationSec: number;
  /** true while the user is scrubbing the vinyl — position updates from audio are ignored */
  isScrubbing: boolean;
  liked: Record<string, boolean>;
  shuffle: boolean;
  repeat: RepeatMode;
  /** most recent first */
  history: Track[];

  currentTrack: () => Track | undefined;
  initialize: () => Promise<void>;
  playQueue: (queue: Track[], startIndex: number) => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (positionSec: number) => Promise<void>;
  /** ramp the current track's volume up from silence (Visual entry) */
  fadeIn: () => void;
  seekBy: (deltaSec: number) => Promise<void>;
  setScrubbing: (scrubbing: boolean) => void;
  /** optimistic position while scrubbing (vinyl drag / progress drag) */
  setScrubPosition: (positionSec: number) => void;
  toggleLike: (trackId?: string) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

let configured = false;
let loadToken = 0;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
  queue: [],
  currentIndex: -1,
  status: 'idle',
  positionSec: 0,
  durationSec: 0,
  isScrubbing: false,
  liked: {},
  shuffle: false,
  repeat: 'off',
  history: [],

  currentTrack: () => get().queue[get().currentIndex],

  initialize: async () => {
    if (configured) return;
    configured = true;
    await audioService.configure({
      onPositionChange: (positionSec, durationSec) => {
        if (get().isScrubbing) return;
        set({ positionSec, durationSec });
        // backfill duration for imported files once the engine knows it
        const track = get().currentTrack();
        if (track && durationSec > 0 && Math.abs(track.duration - durationSec) >= 1) {
          useLibraryStore.getState().setTrackDuration(track.id, durationSec);
        }
      },
      onTrackEnd: () => {
        const { repeat } = get();
        if (repeat === 'one') {
          void get().seekTo(0);
          audioService.play();
          return;
        }
        get().next();
      },
    });
    // preload AFTER the audio session is configured
    soundService.preload();
  },

  playQueue: (queue, startIndex) => {
    const track = queue[startIndex];
    if (!track) return;
    const token = ++loadToken;
    set((s) => ({
      queue,
      currentIndex: startIndex,
      status: 'loading',
      positionSec: 0,
      durationSec: track.duration,
      history: [track, ...s.history.filter((t) => t.id !== track.id)].slice(0, HISTORY_LIMIT),
    }));
    // UI state is already updated above — load + play catch up async,
    // and the token discards this load if a newer press superseded it
    void (async () => {
      await audioService.load(track.uri);
      if (token !== loadToken) return;
      audioService.play();
      set({ status: 'playing' });
    })();
  },

  togglePlayPause: () => {
    const { status } = get();
    if (status === 'playing') {
      audioService.pause();
      set({ status: 'paused' });
    } else if (status === 'paused') {
      audioService.play();
      set({ status: 'playing' });
    }
  },

  next: () => {
    const { queue, currentIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;

    if (shuffle && queue.length > 1) {
      let idx = currentIndex;
      while (idx === currentIndex) idx = Math.floor(Math.random() * queue.length);
      get().playQueue(queue, idx);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        get().playQueue(queue, 0);
        return;
      }
      audioService.pause();
      set({ status: 'paused', positionSec: 0 });
      void audioService.seekTo(0);
      return;
    }
    get().playQueue(queue, nextIndex);
  },

  previous: () => {
    const { queue, currentIndex, positionSec } = get();
    // Standard behavior: restart current track unless within its first 3 seconds
    if (positionSec > 3 || currentIndex <= 0) {
      set({ positionSec: 0 });
      void get().seekTo(0);
      return;
    }
    get().playQueue(queue, currentIndex - 1);
  },

  seekTo: async (positionSec) => {
    await audioService.seekTo(positionSec);
    set({ positionSec: audioService.positionSec });
  },

  fadeIn: () => audioService.fadeIn(),

  seekBy: async (deltaSec) => {
    await audioService.seekBy(deltaSec);
    set({ positionSec: audioService.positionSec });
  },

  setScrubbing: (isScrubbing) => set({ isScrubbing }),
  setScrubPosition: (positionSec) => set({ positionSec }),

  toggleLike: (trackId) => {
    const id = trackId ?? get().currentTrack()?.id;
    if (!id) return;
    set((s) => ({ liked: { ...s.liked, [id]: !s.liked[id] } }));
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
    }),
    {
      name: 'vinyl-player',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        liked: s.liked,
        history: s.history,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
);
