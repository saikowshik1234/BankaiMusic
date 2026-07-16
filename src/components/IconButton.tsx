/**
 * 40pt rounded-14 icon button. Theme-aware surface; `glass` variant for
 * use over gradients/photos.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { palette, radius, shadows } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

type IconName = keyof typeof MaterialIcons.glyphMap;

export function IconButton({
  icon,
  label,
  onPress,
  glass = false,
  size = 22,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  glass?: boolean;
  size?: number;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: glass ? 'rgba(255,255,255,0.18)' : theme.surface },
        glass && { shadowOpacity: 0 },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <MaterialIcons name={icon} size={size} color={glass ? palette.white : theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.iconButton,
  },
});
