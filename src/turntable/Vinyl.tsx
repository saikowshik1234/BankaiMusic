/**
 * The vinyl disc. Spins at 60°/s while playing (eased), drag to scrub:
 * disc follows the finger 1:1, one full revolution = 8s of audio (design.json > motion).
 * Gloss overlay is fixed — it does NOT rotate with the disc.
 *
 * CRASH LESSON (see CLAUDE.md): gesture callbacks must NOT touch the zustand
 * store while running as UI-thread worklets. This gesture runs on the JS
 * thread (.runOnJS(true)); only the continuous spin loop is a worklet.
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { soundService } from '@/services/audio/soundService';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { device, motion, shadows } from '@/theme';

const SIZE = 232;
const HUB = 120;

function VinylFace() {
  const grooves = [88, 96, 104, 76] as const;
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <RadialGradient id="disc" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={device.vinylOuter} />
          <Stop offset="40%" stopColor={device.vinylMid} />
          <Stop offset="72%" stopColor={device.vinylDeep} />
          <Stop offset="100%" stopColor={device.vinylEdge} />
        </RadialGradient>
        <RadialGradient id="hub" cx="42%" cy="36%" r="70%">
          <Stop offset="0%" stopColor={device.hubLight} />
          <Stop offset="68%" stopColor={device.hubMid} />
          <Stop offset="100%" stopColor={device.hubDark} />
        </RadialGradient>
      </Defs>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#disc)" />
      {grooves.map((r) => (
        <Circle
          key={r}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke="rgba(210,210,215,0.08)"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: 14 }, (_, i) => 62 + i * 3.4).map((r) => (
        <Circle
          key={`g${r}`}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.035)"
          strokeWidth={0.7}
        />
      ))}
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={HUB / 2} fill="url(#hub)" />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={HUB / 2}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
      {[0, 126, 234].map((deg) => (
        <Rect
          key={deg}
          x={SIZE / 2 - 1}
          y={SIZE / 2 - HUB / 2 + 15}
          width={2}
          height={15}
          rx={1}
          fill="rgba(255,255,255,0.55)"
          transform={`rotate(${deg} ${SIZE / 2} ${SIZE / 2})`}
        />
      ))}
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={6.5} fill={device.hubDark} />
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={4.5} fill={device.spindle} />
    </Svg>
  );
}

function Gloss() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id="sheen" cx="70%" cy="20%" r="80%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.38} />
            <Stop offset="24%" stopColor="#FFFFFF" stopOpacity={0.08} />
            <Stop offset="44%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <SvgLinearGradient id="streak" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="32%" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity={0.3} />
            <Stop offset="66%" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#sheen)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#streak)" opacity={0.75} />
      </Svg>
    </View>
  );
}

export function Vinyl() {
  const status = usePlayerStore((s) => s.status);
  const isPlaying = status === 'playing';
  const reducedMotion = useReducedMotion();

  const angle = useSharedValue(0);
  const velocity = useSharedValue(0); // deg/sec
  const dragging = useSharedValue(false);

  // continuous spin with inertia — the only UI-thread loop here
  useFrameCallback((frame) => {
    if (dragging.value) return;
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    const target = isPlaying && !reducedMotion ? motion.vinylDegPerSec : 0;
    const factor = isPlaying ? motion.vinylSpinUpFactor : motion.vinylSpinDownFactor;
    velocity.value += (target - velocity.value) * Math.min(1, factor * dt * 60);
    if (Math.abs(velocity.value) < 0.01 && target === 0) velocity.value = 0;
    angle.value += velocity.value * dt;
  }, true);

  // JS-thread drag state (plain refs via closure would reset on re-render;
  // shared values double as stable mutable slots)
  const lastPointerAngle = useSharedValue(0);
  const scrubTarget = useSharedValue(0);
  const lastPreviewSent = useSharedValue(0);
  const lastHapticBucket = useSharedValue(0);

  // Entire gesture runs on the JS thread so it may talk to stores/services.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      dragging.value = true;
      velocity.value = 0;
      lastPointerAngle.value = Math.atan2(e.y - SIZE / 2, e.x - SIZE / 2);
      const { positionSec, setScrubbing } = usePlayerStore.getState();
      scrubTarget.value = positionSec;
      lastPreviewSent.value = positionSec;
      lastHapticBucket.value = Math.floor(positionSec / 5);
      setScrubbing(true);
      soundService.startSpin();
    })
    .onUpdate((e) => {
      const a = Math.atan2(e.y - SIZE / 2, e.x - SIZE / 2);
      let d = a - lastPointerAngle.value;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      lastPointerAngle.value = a;
      const deg = (d * 180) / Math.PI;
      angle.value += deg;

      const { durationSec, setScrubPosition } = usePlayerStore.getState();
      const next = Math.max(
        0,
        Math.min(durationSec || 0, scrubTarget.value + (deg / 360) * motion.scrubSecondsPerRev),
      );
      scrubTarget.value = next;

      // throttle store writes to ~4/sec of audio distance
      if (Math.abs(next - lastPreviewSent.value) > 0.25) {
        lastPreviewSent.value = next;
        setScrubPosition(next);
      }

      const bucket = Math.floor(next / 5);
      if (bucket !== lastHapticBucket.value) {
        lastHapticBucket.value = bucket;
        if (useSettingsStore.getState().hapticsEnabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    })
    .onFinalize(() => {
      dragging.value = false;
      soundService.stopSpin();
      const store = usePlayerStore.getState();
      void store.seekTo(scrubTarget.value).finally(() => store.setScrubbing(false));
    });

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.wrap}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Record. Drag in a circle to scrub through the song"
      >
        <Animated.View style={spinStyle}>
          <VinylFace />
        </Animated.View>
        <Gloss />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    ...shadows.vinyl,
  },
});
