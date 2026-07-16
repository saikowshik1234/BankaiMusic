/**
 * UI sound effects — the zero-latency recipe (every earlier variant had a
 * flaw, all documented in CLAUDE.md):
 *
 *   1. A small POOL of READY players per one-shot is primed ahead of time.
 *   2. A press shifts one hot player off the pool and calls play() — nothing
 *      async in front, so it fires in lockstep with the haptic.
 *   3. After firing, the used player disposes itself on didJustFinish and a
 *      replacement is primed to refill the pool.
 *
 * The pool (rather than a single spare) is what fixed the audible lag on
 * rapid taps: back-to-back presses used to out-run the single re-primed
 * player and hit a cold one. Three hot players absorb a fast finger.
 */
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/stores/settingsStore';

/* eslint-disable @typescript-eslint/no-require-imports */
const SOURCES = {
  pause: require('../../../assets/sounds/pause.wav') as number,
  resume: require('../../../assets/sounds/resume.wav') as number,
  transport: require('../../../assets/sounds/transport.wav') as number,
  tap: require('../../../assets/sounds/tap.wav') as number,
  spinLoop: require('../../../assets/sounds/spin-loop.mp3') as number,
} as const;

type SoundName = keyof typeof SOURCES;

/** pooled one-shots — kept hot so a press fires instantly */
const ONE_SHOTS: SoundName[] = ['tap'];
const POOL_SIZE = 3;

function disposeWhenDone(p: AudioPlayer, hardStopMs = 10_000): void {
  const dispose = () => {
    try {
      sub.remove();
    } catch {
      /* ignore */
    }
    try {
      p.pause();
      p.remove();
    } catch {
      /* ignore */
    }
  };
  const sub = p.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) dispose();
  });
  setTimeout(dispose, hardStopMs); // safety net — never leak a player
}

class SoundService {
  private pools = new Map<SoundName, AudioPlayer[]>();
  private spinPlayer: AudioPlayer | null = null;

  private get enabled(): boolean {
    return useSettingsStore.getState().uiSoundsEnabled;
  }

  /**
   * Create AND PRIME a ready player, then park it in its pool. expo-audio
   * wraps the platform players (AVPlayer / ExoPlayer), which lazily open
   * their audio pipeline on first play — that lazy open was the audible
   * delay. A muted play/pause cycle forces the decoder + buffers into
   * memory, so the first REAL press hits a hot pipeline.
   */
  private stage(name: SoundName): void {
    try {
      const p = createAudioPlayer(SOURCES[name]);
      p.volume = 0; // silent warm-up
      p.play();
      setTimeout(() => {
        try {
          p.pause();
          void p.seekTo(0).then(() => {
            p.volume = 1.0;
          });
        } catch {
          /* player disposed — a fresh one gets staged on next press */
        }
      }, 60);
      const pool = this.pools.get(name) ?? [];
      pool.push(p);
      this.pools.set(name, pool);
    } catch {
      /* next press will fall back to create-on-demand */
    }
  }

  /** Fill every one-shot pool with hot players (call once at app start). */
  preload(): void {
    ONE_SHOTS.forEach((name) => {
      const have = this.pools.get(name)?.length ?? 0;
      for (let i = have; i < POOL_SIZE; i++) this.stage(name);
    });
  }

  private playOneShot(name: SoundName, stopAfterMs?: number): void {
    if (!this.enabled) return;
    try {
      // fire a pre-primed player IMMEDIATELY…
      const pool = this.pools.get(name);
      let p = pool?.shift();
      if (!p) p = createAudioPlayer(SOURCES[name]); // cold fallback
      p.volume = 1.0;
      p.play();
      // …then do housekeeping after the sound is already out
      disposeWhenDone(p, stopAfterMs ?? 10_000);
      if (ONE_SHOTS.includes(name)) this.stage(name); // refill the pool
    } catch {
      // UI sounds must never break playback
    }
  }

  pause(): void {
    this.playOneShot('pause');
  }

  resume(): void {
    this.playOneShot('resume');
  }

  transport(): void {
    this.playOneShot('transport');
  }

  /** satisfying chime when the Earth is tapped on the idle Visual screen */
  pop(): void {
    this.playOneShot('tap');
  }

  /** short record-shuffle flourish when picking a record in the library */
  shuffle(): void {
    this.playOneShot('spinLoop', 700);
  }

  /** Looping record-spin sound while the user scrubs the vinyl. */
  startSpin(): void {
    if (!this.enabled) return;
    try {
      this.stopSpin();
      this.spinPlayer = createAudioPlayer(SOURCES.spinLoop);
      this.spinPlayer.loop = true;
      this.spinPlayer.volume = 1.0;
      this.spinPlayer.play();
    } catch {
      /* ignore */
    }
  }

  stopSpin(): void {
    try {
      this.spinPlayer?.pause();
      this.spinPlayer?.remove();
    } catch {
      /* ignore */
    }
    this.spinPlayer = null;
  }

}

export const soundService = new SoundService();
