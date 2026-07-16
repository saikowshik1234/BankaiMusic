/**
 * UI-reactive connection status for streaming connectors. The connectors
 * themselves hold the actual OAuth tokens in module scope (never persisted —
 * reconnect each app launch); this store just mirrors "connected?" so
 * components re-render after connect()/disconnect().
 */
import { create } from 'zustand';
import { connectors } from '@/services/connect';
import type { ConnectService } from '@/services/connect';

interface ConnectState {
  connected: Record<ConnectService, boolean>;
  connecting: ConnectService | null;
  error: string | null;
  connect: (service: ConnectService) => Promise<void>;
  disconnect: (service: ConnectService) => void;
}

export const useConnectStore = create<ConnectState>()((set) => ({
  connected: { spotify: false, appleMusic: false, youtubeMusic: false },
  connecting: null,
  error: null,

  connect: async (service) => {
    set({ connecting: service, error: null });
    try {
      const ok = await connectors[service].connect();
      set((s) => ({ connected: { ...s.connected, [service]: ok }, connecting: null }));
    } catch (err) {
      set({ connecting: null, error: err instanceof Error ? err.message : String(err) });
    }
  },

  disconnect: (service) => {
    connectors[service].disconnect();
    set((s) => ({ connected: { ...s.connected, [service]: false } }));
  },
}));
