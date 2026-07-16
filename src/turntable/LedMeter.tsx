/**
 * 2×8 LED level meter, upper-left of the deck. Bottom rows light up;
 * flickers between 3 and 7 lit rows while playing, rests at 2 when paused.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { device, motion } from '@/theme';

const ROWS = 8;
const COLS = 2;

export function LedMeter({ isPlaying }: { isPlaying: boolean }) {
  const [litRows, setLitRows] = useState(2);

  useEffect(() => {
    if (!isPlaying) {
      setLitRows(2);
      return;
    }
    const id = setInterval(() => {
      setLitRows(3 + Math.floor(Math.random() * 5));
    }, motion.ledFlickerMs);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <LinearGradient
      colors={[device.ledPanelTop, device.ledPanelBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.panel}
    >
      <View style={styles.grid}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const row = Math.floor(i / COLS);
          const on = row >= ROWS - litRows;
          return (
            <View
              key={i}
              style={[
                styles.led,
                on && {
                  backgroundColor: device.displayAccent,
                  shadowColor: device.displayAccent,
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            />
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 50,
    height: 174,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  grid: {
    width: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  led: {
    width: 13,
    height: 13,
    borderRadius: 3,
    backgroundColor: device.ledOff,
  },
});
