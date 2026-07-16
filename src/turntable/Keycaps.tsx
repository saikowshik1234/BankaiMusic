/**
 * Four vertical transport keycaps: play/pause (with glow LED), prev, next, repeat.
 * Keycaps physically depress on press.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { device } from '@/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

function Keycap({
  icon,
  label,
  onPress,
  children,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const pressedStyle: ViewStyle = pressed ? { transform: [{ translateY: 2 }] } : {};

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      // fire on press-DOWN: haptic + action with zero wait-for-release,
      // so rapid taps register exactly as fast as the finger moves
      onPressIn={() => {
        setPressed(true);
        if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressOut={() => setPressed(false)}
      style={pressedStyle}
    >
      <LinearGradient
        colors={[device.keycapTop, device.keycapBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.cap, pressed && styles.capPressed]}
      >
        <MaterialIcons
          name={icon}
          size={icon === 'pause' || icon === 'play-arrow' ? 20 : 17}
          color={icon === 'pause' || icon === 'play-arrow' ? device.keycapIcon : device.keycapIconSoft}
        />
        {children}
      </LinearGradient>
    </Pressable>
  );
}

export function Keycaps() {
  const status = usePlayerStore((s) => s.status);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const isPlaying = status === 'playing';

  return (
    <View style={styles.row}>
      <Keycap
        icon={isPlaying ? 'pause' : 'play-arrow'}
        label={isPlaying ? 'Pause' : 'Play'}
        onPress={togglePlayPause}
      >
        <View style={[styles.led, { opacity: isPlaying ? 1 : 0.25 }]} />
      </Keycap>
      <Keycap icon="fast-rewind" label="Previous track" onPress={() => void previous()} />
      <Keycap icon="fast-forward" label="Next track" onPress={() => void next()} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  cap: {
    width: 40,
    height: 78,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  capPressed: {
    shadowOpacity: 0.05,
  },
  led: {
    position: 'absolute',
    bottom: 6,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: device.displayAccent,
    shadowColor: device.displayAccent,
    shadowOpacity: 1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
});
