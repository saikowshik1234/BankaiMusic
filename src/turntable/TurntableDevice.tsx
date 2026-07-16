/**
 * The full turntable device (design coordinates 300×398, vinyl overhangs
 * top-right). Scales down uniformly on narrow screens.
 */
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { usePlayerStore } from '@/stores/playerStore';
import { device, radius, shadows } from '@/theme';
import { DisplayPanel } from './DisplayPanel';
import { Keycaps } from './Keycaps';
import { LedMeter } from './LedMeter';
import { SpeakerGrille } from './SpeakerGrille';
import { Vinyl } from './Vinyl';

const W = 300;
const H = 398;
/** vinyl overhang: right -40, top -60 (232px disc) */
const OVERHANG_TOP = 60;
const OVERHANG_RIGHT = 40;

export function TurntableDevice() {
  const { width } = useWindowDimensions();
  const track = usePlayerStore((s) => s.currentTrack());
  const status = usePlayerStore((s) => s.status);
  const isPlaying = status === 'playing';
  const reducedMotion = useReducedMotion();

  // record-drop entrance: when a new record arrives from the crate,
  // it lands on the platter with a little spring
  const drop = useSharedValue(1);
  useEffect(() => {
    if (!track?.id || reducedMotion) return;
    drop.value = 0;
    drop.value = withSpring(1, { damping: 14, stiffness: 160 });
  }, [track?.id, reducedMotion, drop]);

  const dropStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + drop.value * 0.5,
    transform: [
      { translateY: (1 - drop.value) * -46 },
      { scale: 0.86 + drop.value * 0.14 },
    ],
  }));

  const scale = Math.min(1, (width - 48) / (W + OVERHANG_RIGHT));

  return (
    <View
      style={{
        width: (W + OVERHANG_RIGHT) * scale,
        height: (H + OVERHANG_TOP) * scale,
      }}
    >
      <View
        style={[
          styles.designSpace,
          {
            transform: [
              { translateX: (-(W + OVERHANG_RIGHT) * (1 - scale)) / 2 },
              { translateY: (-(H + OVERHANG_TOP) * (1 - scale)) / 2 },
              { scale },
            ],
          },
        ]}
      >
        {/* deck body */}
        <View style={styles.bodyShadow}>
          <LinearGradient
            colors={[device.bodyLight, device.bodyMid, device.bodyDark]}
            start={{ x: 0.85, y: 0 }}
            end={{ x: 0.15, y: 1 }}
            style={styles.body}
          >
            {/* LED meter — upper-left */}
            <View style={{ position: 'absolute', left: 22, top: 26 }}>
              <LedMeter isPlaying={isPlaying} />
            </View>

            {/* display panel */}
            <View style={{ position: 'absolute', left: 22, top: 228 }}>
              <DisplayPanel title={track?.title ?? 'No disc'} isPlaying={isPlaying} />
            </View>

            {/* transport keycaps */}
            <View style={{ position: 'absolute', left: 22, top: 296 }}>
              <Keycaps />
            </View>

            {/* speaker grille */}
            <View style={{ position: 'absolute', right: 24, bottom: 24 }}>
              <SpeakerGrille />
            </View>
          </LinearGradient>
        </View>

        {/* vinyl overhangs the deck's top-right corner */}
        <Animated.View style={[styles.vinylSlot, dropStyle]}>
          <Vinyl />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  designSpace: {
    position: 'absolute',
    left: 0,
    top: OVERHANG_TOP,
    width: W + OVERHANG_RIGHT,
    height: H,
  },
  bodyShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: W,
    height: H,
    borderRadius: radius.device,
    ...shadows.deviceBody,
  },
  body: {
    width: W,
    height: H,
    borderRadius: radius.device,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  vinylSlot: {
    position: 'absolute',
    // 232px disc, deck right edge at x=300, disc extends 40 past it
    left: W + OVERHANG_RIGHT - 232,
    top: -OVERHANG_TOP,
  },
});
