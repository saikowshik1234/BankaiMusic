/**
 * Visual — the Earth and Moon diorama (design.json > screens.visual).
 *
 * Idle: drag to spin, pinch to zoom, tap for a zoom-pulse + chime.
 * Playing: the Earth gently rocks and pulses with the beat envelope —
 * no bars, no labels; the model IS the visualizer.
 *
 * The GLB is textureless (flat baseColorFactor materials — blue oceans,
 * green land, a gray moon), so GLTFLoader has no texture pipeline to trip
 * over on this stack; materials are kept exactly as authored in Blender.
 */
import { Asset } from 'expo-asset';
import { File as FSFile } from 'expo-file-system'; // NEW API: native binary reads
import * as FileSystem from 'expo-file-system/legacy';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Box3, Color, DoubleSide, Group, Material, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { soundService } from '@/services/audio/soundService';

const MODEL = require('../../assets/models/earth-moon.glb');
const TARGET_SIZE = 1.734; // 15% smaller again (was 2.04)
const PULSE_DUR = 0.6; // seconds — idle tap zoom-pulse

export type SkyMode = 'night' | 'day';

const SKY = {
  night: { top: '#02030A', bottom: '#0B1230' },
  day: { top: '#FDE7C6', bottom: '#F0A45B' },
} as const;

const SKY_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
varying vec2 vUv;
uniform vec3 topColor;
uniform vec3 bottomColor;
void main() {
  gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
}`;

function Sky({ mode }: { mode: SkyMode }) {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new Color(SKY[mode].top) },
      bottomColor: { value: new Color(SKY[mode].bottom) },
    }),
    [mode],
  );
  return (
    <mesh position={[0, 0, -20]}>
      <planeGeometry args={[90, 90]} />
      <shaderMaterial
        key={mode}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const pts = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const r = 14 + Math.random() * 4;
      // uniform point on a sphere, then pinned behind the camera so stars
      // fill the WHOLE backdrop (full x + full y) instead of clumping up top
      const u = Math.random() * 2 - 1; // cos(phi): full vertical range -r..r
      const t = Math.random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      pts[i * 3] = r * ring * Math.cos(t);
      pts[i * 3 + 1] = r * u;
      pts[i * 3 + 2] = -Math.abs(r * ring * Math.sin(t)) - 2; // always behind
    }
    return pts;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.1} sizeAttenuation color="#FFFFFF" transparent opacity={0.85} />
    </points>
  );
}

function Sun() {
  return (
    <group position={[-4.2, 2.6, -14]}>
      <mesh>
        <circleGeometry args={[1.1, 40]} />
        <meshBasicMaterial color="#FFF3DC" />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color="#FFDCA0" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

interface StageControls {
  rotY: number;
  rotX: number;
  velY: number;
  zoom: number;
  dragging: boolean;
  playing: boolean;
  /** timer for the idle tap zoom-pulse; >= PULSE_DUR means inactive */
  pulseT: number;
}

/** honest fake beat: layered sines, only advances while playing */
function beatEnvelope(t: number): number {
  const raw =
    Math.sin(t * 2.3) * 0.55 +
    Math.sin(t * 5.1 + 1.3) * 0.3 +
    Math.sin(t * 9.7 + 0.4) * 0.15;
  return Math.max(0, raw) ** 1.4;
}

// lookup-table base64 decoder — O(n) with no string scans. Only the
// fallback path; the primary path reads raw bytes natively.
const B64_TABLE = (() => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = i;
  return table;
})();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const len = base64.length;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  const byteLength = (len / 4) * 3 - padding;
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;
  for (let i = 0; i < len; i += 4) {
    const n =
      ((B64_TABLE[base64.charCodeAt(i)] ?? 0) << 18) |
      ((B64_TABLE[base64.charCodeAt(i + 1)] ?? 0) << 12) |
      (((B64_TABLE[base64.charCodeAt(i + 2)] ?? 0) & 63) << 6) |
      ((B64_TABLE[base64.charCodeAt(i + 3)] ?? 0) & 63);
    if (byteIndex < byteLength) bytes[byteIndex++] = (n >> 16) & 255;
    if (byteIndex < byteLength) bytes[byteIndex++] = (n >> 8) & 255;
    if (byteIndex < byteLength) bytes[byteIndex++] = n & 255;
  }
  return bytes.buffer;
}

/** Read the model as raw bytes — new FS API first, base64 fallback. */
async function readModelBuffer(uri: string): Promise<ArrayBuffer> {
  try {
    const bytes = await new FSFile(uri).bytes();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  } catch {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  }
}

function parseGltfScene(buffer: ArrayBuffer): Promise<Group> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', (gltf) => resolve(gltf.scene), reject);
  });
}

function useStoreModel(): { model: Group | null; error: string | null } {
  const [model, setModel] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t0 = Date.now();
      const asset = Asset.fromModule(MODEL);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      console.log('[Visual] asset ready in', Date.now() - t0, 'ms →', uri);
      const buffer = await readModelBuffer(uri);
      console.log('[Visual] bytes read:', buffer.byteLength, 'in', Date.now() - t0, 'ms');
      const scene = await parseGltfScene(buffer);
      console.log('[Visual] parsed in', Date.now() - t0, 'ms');
      if (cancelled) return;

      // GLBs have arbitrary source scale/origin — re-center and normalize
      // to a fixed on-screen size (see CLAUDE.md gotchas)
      const box = new Box3().setFromObject(scene);
      const size = box.getSize(new Vector3()).length() || 1;
      const center = box.getCenter(new Vector3());
      scene.position.sub(center);
      scene.scale.setScalar(TARGET_SIZE / size);
      // Some faces on the low-poly Earth are wound single-sided and drop out
      // under backface culling (the moon is watertight, so it looked fine while
      // the Earth rendered with holes). Force every material double-sided.
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          m.side = DoubleSide;
          m.needsUpdate = true;
        });
      });
      setModel(scene);
    })().catch((err) => {
      console.warn('Visual: failed to load model', err);
      if (!cancelled) setError(String(err?.message ?? err));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { model, error };
}

function StageScene({
  controls,
  mode,
  onModelReady,
}: {
  controls: React.MutableRefObject<StageControls>;
  mode: SkyMode;
  onModelReady: (state: { ready: boolean; error: string | null }) => void;
}) {
  const { model, error } = useStoreModel();

  useEffect(() => {
    onModelReady({ ready: model !== null, error });
  }, [model, error, onModelReady]);
  const rig = useRef<Group>(null);
  const energy = useRef(0);
  const musicT = useRef(0);

  useFrame((_, dt) => {
    const c = controls.current;

    if (c.playing) {
      musicT.current += dt;
      const beat = beatEnvelope(musicT.current);
      energy.current += (0.35 + beat * 0.65 - energy.current) * Math.min(1, dt * 6);
      c.rotY += dt * (0.2 + beat * 0.35);
    } else {
      energy.current += (0 - energy.current) * Math.min(1, dt * 3);
      if (!c.dragging) {
        c.rotY += c.velY * dt;
        c.velY *= Math.pow(0.32, dt); // longer glide
      }
    }

    // idle tap zoom-pulse: a smooth 0 -> 1 -> 0 bump over PULSE_DUR seconds
    let tapPulse = 0;
    if (c.pulseT < PULSE_DUR) {
      c.pulseT += dt;
      tapPulse = Math.sin(Math.min(1, c.pulseT / PULSE_DUR) * Math.PI);
    }

    if (rig.current) {
      rig.current.rotation.y = c.rotY;
      // subtle beat rock instead of bars — the Earth sways with the music
      rig.current.rotation.x = c.rotX + energy.current * 0.02 * Math.sin(musicT.current * 4.6);
      rig.current.scale.setScalar(c.zoom * (1 + energy.current * 0.045 + tapPulse * 0.196));
    }
  });

  return (
    <>
      <Sky mode={mode} />
      {mode === 'night' ? <Stars /> : <Sun />}

      {mode === 'day' ? (
        <>
          <directionalLight position={[-3.2, 3.6, 2.4]} intensity={1.7} color="#FFDDB0" />
          <directionalLight position={[3.4, 2.6, -1.6]} intensity={0.55} color="#AFD3F2" />
          <ambientLight intensity={0.62} />
        </>
      ) : (
        <>
          <directionalLight position={[-3.2, 3.6, 2.4]} intensity={1.15} color="#BFD4FF" />
          {/* warm sunlight fill at night — the terminator glow on the globe */}
          <directionalLight position={[1.6, 1.2, 2.6]} intensity={0.5} color="#FFB870" />
          <ambientLight intensity={0.36} />
        </>
      )}
      <directionalLight position={[0, -1.5, -3]} intensity={0.2} color="#FFFFFF" />

      <group ref={rig}>{model ? <primitive object={model} /> : null}</group>
    </>
  );
}

export function EarthGlobe({
  height,
  mode = 'night',
  playing = false,
}: {
  height: number;
  mode?: SkyMode;
  playing?: boolean;
}) {
  const controls = useRef<StageControls>({
    rotY: 0,
    rotX: 0,
    velY: 0,
    zoom: 1,
    dragging: false,
    playing,
    pulseT: 999,
  });
  controls.current.playing = playing;
  const pinchStart = useRef(1);
  const dragStart = useRef({ rotY: 0, rotX: 0 });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .maxPointers(1)
    // start (not begin) so a plain tap never zeroes the spin momentum —
    // tapping zooms WHILE the model keeps spinning
    .onStart(() => {
      const c = controls.current;
      if (c.playing) return; // the music owns the stage while playing
      c.dragging = true;
      c.velY = 0;
      dragStart.current = { rotY: c.rotY, rotX: c.rotX };
    })
    .onUpdate((e) => {
      const c = controls.current;
      if (c.playing || !c.dragging) return;
      // more responsive: rotation tracks finger travel more tightly
      c.rotY = dragStart.current.rotY + e.translationX * 0.011;
      c.rotX = Math.max(-0.35, Math.min(0.35, dragStart.current.rotX + e.translationY * 0.004));
    })
    .onFinalize((e) => {
      const c = controls.current;
      if (!c.dragging) return;
      c.dragging = false;
      // faster flick -> faster glide
      c.velY = e.velocityX * 0.006;
    });

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      pinchStart.current = controls.current.zoom;
    })
    .onUpdate((e) => {
      controls.current.zoom = Math.max(0.7, Math.min(1.7, pinchStart.current * e.scale));
    });

  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(260)
    .maxDistance(12)
    .onEnd(() => {
      const c = controls.current;
      if (c.playing) return; // the music owns the stage while playing
      c.pulseT = 0; // trigger the zoom-pulse
      soundService.pop();
    });

  // Exclusive(pan, tap): a drag spins (pan wins) and never fires the tap;
  // a still tap zooms + chimes. Pinch still runs alongside either.
  const gesture = useMemo(
    () => Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap)),
    [pan, pinch, tap],
  );
  const [modelState, setModelState] = useState<{ ready: boolean; error: string | null }>({
    ready: false,
    error: null,
  });

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          playing
            ? 'The Earth and Moon sway with the music'
            : 'The Earth and Moon. Drag to spin, pinch to zoom, tap to zoom in'
        }
      >
        <Canvas
          camera={{ position: [0, 1.7, 5.6], fov: 32 }}
          onCreated={({ camera }) => camera.lookAt(0, -0.2, 0)}
          style={{ flex: 1 }}
        >
          <StageScene controls={controls} mode={mode} onModelReady={setModelState} />
        </Canvas>
        {!modelState.ready && (
          <View style={loaderStyles.overlay} pointerEvents="none">
            {modelState.error ? (
              <Text style={loaderStyles.errorText}>
                Couldn't load the model{'\n'}
                {modelState.error}
              </Text>
            ) : (
              <ActivityIndicator size="large" color="#FE6D73" />
            )}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const loaderStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#FE6D73',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
