/**
 * Now Playing — audio-reactive visualizer (design.json v4 > screens.nowPlaying.visualizer).
 * A themed alternative to the turntable device: concentric coral/teal/cerulean
 * rings that pulse to the beat.
 *
 * Honest limitation: expo-audio exposes no waveform/FFT tap for PLAYBACK (no
 * Web-Audio-style AnalyserNode equivalent on this stack), so this is NOT
 * driven by the real frequency content of the track. It's a layered-sine
 * "fake" envelope — several oscillators at different speeds/phases plus an
 * occasional bigger kick pulse — tuned to look and feel reactive while the
 * player is actually playing, and to go still when paused. A true FFT-driven
 * version would need a native audio-tap module this project doesn't have.
 */
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useRef } from 'react';
import { View } from 'react-native';
import type { Group, Mesh, MeshBasicMaterial } from 'three';

const RING_COLORS = ['#FE6D73', '#17C3B2', '#227C9D', '#FFCB77'] as const;

interface RingSpec {
  color: string;
  baseRadius: number;
  speed: number;
  phase: number;
}

const RINGS: RingSpec[] = RING_COLORS.map((color, i) => ({
  color,
  baseRadius: 0.55 + i * 0.42,
  speed: 1.3 + i * 0.35,
  phase: i * 1.7,
}));

function Ring({ spec, playing, kick }: { spec: RingSpec; playing: React.MutableRefObject<boolean>; kick: React.MutableRefObject<number> }) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    const envelope = playing.current ? 1 : 0.15;
    const wobble = Math.sin(t * spec.speed + spec.phase) * 0.5 + 0.5; // 0..1
    const pulse = (0.85 + wobble * 0.3 + kick.current * 0.5) * envelope;
    mesh.current.scale.setScalar(pulse);
    const mat = mesh.current.material as MeshBasicMaterial;
    mat.opacity = (0.22 + wobble * 0.35) * envelope + 0.03;
  });

  return (
    <mesh ref={mesh} rotation={[0, 0, 0]}>
      <ringGeometry args={[spec.baseRadius, spec.baseRadius + 0.05, 64]} />
      <meshBasicMaterial color={spec.color} transparent opacity={0.3} />
    </mesh>
  );
}

function VisualizerScene({ isPlaying }: { isPlaying: boolean }) {
  const rig = useRef<Group>(null);
  const playing = useRef(isPlaying);
  playing.current = isPlaying;
  const kick = useRef(0);
  const nextKickAt = useRef(0);

  useFrame(({ clock }, dt) => {
    if (rig.current) rig.current.rotation.z += dt * 0.08;
    // decay the current kick, and occasionally schedule a new one — stands
    // in for a beat detector we don't have real audio data to drive.
    kick.current = Math.max(0, kick.current - dt * 1.6);
    if (playing.current && clock.elapsedTime > nextKickAt.current) {
      kick.current = 1;
      nextKickAt.current = clock.elapsedTime + 0.45 + Math.random() * 0.35;
    }
  });

  return (
    <group ref={rig}>
      {RINGS.map((spec) => (
        <Ring key={spec.color} spec={spec} playing={playing} kick={kick} />
      ))}
    </group>
  );
}

export function NowPlayingVisualizer({ height, isPlaying }: { height: number; isPlaying: boolean }) {
  return (
    <View
      style={{ height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="A pulsing ring visualizer reacting to playback"
    >
      <Canvas camera={{ position: [0, 0, 4.4], fov: 40 }} style={{ flex: 1 }}>
        <VisualizerScene isPlaying={isPlaying} />
      </Canvas>
    </View>
  );
}
