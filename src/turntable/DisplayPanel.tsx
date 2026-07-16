/**
 * Dark inset display: glowing mono track title + 10-bar EQ animation.
 * Bars freeze when paused.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { device, font } from '@/theme';

const BAR_TIMINGS: ReadonlyArray<{ duration: number; delay: number }> = [
  { duration: 800, delay: 0 },
  { duration: 700, delay: 500 },
  { duration: 900, delay: 200 },
  { duration: 650, delay: 700 },
  { duration: 850, delay: 300 },
  { duration: 750, delay: 600 },
  { duration: 950, delay: 150 },
  { duration: 700, delay: 400 },
  { duration: 820, delay: 550 },
  { duration: 680, delay: 250 },
];

function EqBar({ isPlaying, duration, delay }: { isPlaying: boolean; duration: number; delay: number }) {
  const scale = useSharedValue(0.35);

  useEffect(() => {
    if (isPlaying) {
      scale.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: duration / 2 }), -1, true),
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.35, { duration: 180 });
    }
  }, [isPlaying, duration, delay, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function DisplayPanel({ title, isPlaying }: { title: string; isPlaying: boolean }) {
  return (
    <LinearGradient
      colors={[device.panelTop, device.panelBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.panel}
    >
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.eq}>
        {BAR_TIMINGS.map((t, i) => (
          <EqBar key={i} isPlaying={isPlaying} duration={t.duration} delay={t.delay} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 256,
    height: 48,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontFamily: font.mono,
    fontSize: 14,
    letterSpacing: 2.2,
    color: device.displayAccent,
    textTransform: 'uppercase',
    maxWidth: 118,
    textShadowColor: `rgba(${device.displayGlowRgb},0.7)`,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  eq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: 22,
  },
  bar: {
    width: 2.5,
    height: '100%',
    borderRadius: 2,
    backgroundColor: device.displayAccent,
  },
});
