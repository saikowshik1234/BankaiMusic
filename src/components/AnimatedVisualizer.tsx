import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { palette } from '@/theme';

interface Props {
  height: number;
  isPlaying: boolean;
}

const BAR_COLORS = [palette.coral, palette.tiffany, palette.cerulean, palette.sunset, palette.coral, palette.tiffany];
const BAR_COUNT = BAR_COLORS.length;

function AnimatedBar({ index, isPlaying, baseHeight }: { index: number; isPlaying: boolean; baseHeight: number }) {
  const heightValue = useSharedValue(isPlaying ? baseHeight : 4);
  const opacityValue = useSharedValue(isPlaying ? 0.8 : 0.3);

  // Each bar gets slightly different animation parameters based on its index
  const speed = 400 + (index % 3) * 150;
  const maxScale = 1.5 + (index % 2) * 0.5;

  useEffect(() => {
    if (isPlaying) {
      opacityValue.value = withTiming(0.8, { duration: 300 });
      
      // Honest fake envelope: bounce between small and large heights
      heightValue.value = withRepeat(
        withSequence(
          withTiming(baseHeight * maxScale, { duration: speed, easing: Easing.inOut(Easing.ease) }),
          withTiming(baseHeight * 0.4, { duration: speed * 1.2, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite repeat
        true // reverse
      );
    } else {
      // Return to idle state
      cancelAnimation(heightValue);
      opacityValue.value = withTiming(0.3, { duration: 500 });
      heightValue.value = withTiming(4, { duration: 500, easing: Easing.out(Easing.ease) });
    }
  }, [isPlaying, baseHeight, maxScale, speed, heightValue, opacityValue]);

  const style = useAnimatedStyle(() => ({
    height: heightValue.value,
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { backgroundColor: BAR_COLORS[index] },
        style,
      ]}
    />
  );
}

export function AnimatedVisualizer({ height, isPlaying }: Props) {
  const { width } = useWindowDimensions();
  // Size the bars relative to the screen size
  const maxBarHeight = Math.min(height * 0.4, 100);

  return (
    <View
      style={[styles.container, { height, width: width * 0.6 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="A pulsing bar visualizer reacting to playback"
    >
      <View style={styles.barsRow}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <AnimatedBar
            key={i}
            index={i}
            isPlaying={isPlaying}
            baseHeight={maxBarHeight * (0.5 + Math.random() * 0.5)} // randomize initial heights a bit
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: '100%',
  },
  bar: {
    width: 14,
    borderRadius: 7,
  },
});
