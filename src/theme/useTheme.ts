import { useSettingsStore } from '@/stores/settingsStore';
import { themes, type ThemeColors } from '@/theme';

/** Theme colors for the active appearance. Accents stay constant. */
export function useThemeColors(): ThemeColors {
  const darkMode = useSettingsStore((s) => s.darkMode);
  return darkMode ? themes.dark : themes.light;
}
