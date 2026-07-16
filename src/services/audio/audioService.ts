/**
 * Playback engine. The ONLY module that touches expo-audio.
 * Components never import this directly — they act through playerStore.
 */
import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';

export interface AudioServiceEvents {
  onPositionChange: (positionSec: number, durationSec: number) => void;
  onTrackEnd: () => void;
}

class AudioService {
  private player: AudioPlayer | null = null;
  private events: AudioServiceEvents | null = null;
  private statusSubscription: { remove: () => void } | null = null;
  /** true once play() was requested; the status listener starts playback
   *  as soon as the source is loaded, so a play() that lands before the
   *  file is ready never silently no-ops (the "sometimes it won't play" bug) */
  private wantPlay = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  async configure(events: AudioServiceEvents): Promise<void> {
    this.events = events;
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }

  async load(uri: string): Promise<void> {
    this.unload();
    this.clearFade();
    this.wantPlay = false;
    // expo-audio 1.x (SDK 54+): options object with updateInterval in ms
    this.player = createAudioPlayer({ uri }, { updateInterval: 250 });
    this.statusSubscription = this.player.addListener(
      'playbackStatusUpdate',
      (status) => {
        if (!this.events) return;
        this.events.onPositionChange(status.currentTime, status.duration);
        // if play() was requested before the source finished loading, kick it
        // off now that it's ready
        if (this.wantPlay && status.isLoaded && !status.playing && !status.didJustFinish) {
          this.player?.play();
        }
        if (status.didJustFinish) this.events.onTrackEnd();
      },
    );
  }

  play(): void {
    this.wantPlay = true;
    this.player?.play();
  }

  /** Ramp volume 0 -> 1 over durationMs (used when entering the Visual page). */
  fadeIn(durationMs = 750): void {
    if (!this.player) return;
    this.clearFade();
    const steps = 16;
    const stepMs = durationMs / steps;
    let i = 0;
    this.player.volume = 0;
    this.fadeTimer = setInterval(() => {
      i += 1;
      if (this.player) this.player.volume = Math.min(1, i / steps);
      if (i >= steps) this.clearFade();
    }, stepMs);
  }

  private clearFade(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  pause(): void {
    this.wantPlay = false;
    this.player?.pause();
  }

  async seekTo(positionSec: number): Promise<void> {
    if (!this.player) return;
    const duration = this.player.duration || 0;
    const clamped = Math.max(0, Math.min(positionSec, duration));
    await this.player.seekTo(clamped);
  }

  async seekBy(deltaSec: number): Promise<void> {
    if (!this.player) return;
    await this.seekTo(this.player.currentTime + deltaSec);
  }

  get positionSec(): number {
    return this.player?.currentTime ?? 0;
  }

  get durationSec(): number {
    return this.player?.duration ?? 0;
  }

  unload(): void {
    this.clearFade();
    this.statusSubscription?.remove();
    this.statusSubscription = null;
    if (this.player) {
      // pause FIRST — remove() alone releases the handle but the native
      // player can keep sounding, which stacked songs on next/previous
      try {
        this.player.pause();
      } catch {
        /* already released */
      }
      try {
        this.player.remove();
      } catch {
        /* already released */
      }
    }
    this.player = null;
  }
}

/** Singleton — one playback pipeline for the whole app. */
export const audioService = new AudioService();
