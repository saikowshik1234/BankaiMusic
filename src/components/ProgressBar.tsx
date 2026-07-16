/**
 * Seekable progress: 5px inset track, dark gradient fill, white thumb with
 * dark ring, mono timestamps. Tap to seek. Theme-aware.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/stores/playerStore';
import { font, gradients, palette } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ProgressBar() {
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const [width, setWidth] = useState(0);
  const theme = useThemeColors();

  const progress = durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;
  const pct = progress * 100;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const seekAt = (x: number) => {
    if (width <= 0 || durationSec <= 0) return;
    const frac = Math.max(0, Math.min(1, x / width));
    void seekTo(frac * durationSec);
  };

  return (
    <View>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Seek position"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
        onLayout={onLayout}
        onPress={(e) => seekAt(e.nativeEvent.locationX)}
        style={styles.hit}
      >
        <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
          <LinearGradient
            colors={
              theme.statusBar === 'light'
                ? [palette.coral, '#E14E55']
                : [...gradients.progressFill]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${pct}%` }]}
          />
          <View style={[styles.thumb, { left: `${pct}%` }]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <Text style={[styles.time, { color: theme.textFaint }]}>{fmt(positionSec)}</Text>
        <Text style={[styles.time, { color: theme.textFaint }]}>
          {durationSec > 0 ? fmt(durationSec) : '–:––'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 20,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 999,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 999,
  },
  thumb: {
    position: 'absolute',
    top: 2.5,
    marginLeft: -7.5,
    marginTop: -7.5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: '#2F343A',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  time: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.55,
  },
});
