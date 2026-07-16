import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  /** pure-black dark mode */
  darkMode: boolean;
  hapticsEnabled: boolean;
  /** click/whoosh samples on transport controls + record spin */
  uiSoundsEnabled: boolean;
  /** blend tracks (design: 6s) — engine support lands with the backend pass */
  crossfadeEnabled: boolean;
  reduceMotionOverride: boolean;

  setDarkMode: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setUiSoundsEnabled: (v: boolean) => void;
  setCrossfadeEnabled: (v: boolean) => void;
  setReduceMotionOverride: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
  darkMode: false,
  hapticsEnabled: true,
  uiSoundsEnabled: true,
  crossfadeEnabled: false,
  reduceMotionOverride: false,

  setDarkMode: (darkMode) => set({ darkMode }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setUiSoundsEnabled: (uiSoundsEnabled) => set({ uiSoundsEnabled }),
  setCrossfadeEnabled: (crossfadeEnabled) => set({ crossfadeEnabled }),
  setReduceMotionOverride: (reduceMotionOverride) => set({ reduceMotionOverride }),
    }),
    {
      name: 'vinyl-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
