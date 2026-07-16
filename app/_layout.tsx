import {
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useThemeColors } from '@/theme/useTheme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initialize = usePlayerStore((s) => s.initialize);
  const theme = useThemeColors();

  const [fontsLoaded, fontError] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_600SemiBold,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    YangBagus: require('../assets/fonts/YangBagus.ttf') as number,
  });

  useEffect(() => {
    void initialize();
    // find music automatically at every launch (app folder + Android scan)
    void useLibraryStore.getState().autoRefresh();
  }, [initialize]);

  useEffect(() => {
    // Never hang on a font hiccup: reveal the app once fonts load OR error.
    // A failed custom font simply falls back to the system face.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={theme.statusBar === 'light' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        {/* slide-up overlays per design.json > screens.settings/onboarding */}
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="connect" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="identify" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
