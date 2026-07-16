/**
 * Visual — the music visualization page (design.json > screens.visual).
 * Idle: spin the Earth (drag), tap for a zoom-pulse + chime, ambient drone
 * plays. Playing: the Earth rocks with the beat, the drone stops, and the
 * song fades in when you enter the screen.
 */
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { EarthGlobe } from '@/three/EarthGlobe';
import { soundService } from '@/services/audio/soundService';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { font } from '@/theme';

const SKY_TEXT = {
  night: { text: '#F4F1EA', muted: 'rgba(244,241,234,0.6)', bar: 'light' as const },
  day: { text: '#3A2A18', muted: 'rgba(58,42,24,0.65)', bar: 'dark' as const },
};

export default function VisualScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const titleSize = Math.round(Math.min(30, Math.max(22, screenW * 0.062)));
  const darkMode = useSettingsStore((s) => s.darkMode);
  const track = usePlayerStore((s) => s.currentTrack());
  const status = usePlayerStore((s) => s.status);
  const fadeIn = usePlayerStore((s) => s.fadeIn);

  const isPlaying = status === 'playing';
  const mode = darkMode ? 'night' : 'day';
  const colors = SKY_TEXT[mode];

  // Ambient drone: on while this screen is open and nothing is playing.
  useEffect(() => {
    if (isFocused && !isPlaying) soundService.startAmbient();
    else soundService.stopAmbient();
    return () => soundService.stopAmbient();
  }, [isFocused, isPlaying]);

  // Entering the Visual page fades the playing song up from silence.
  useEffect(() => {
    if (isFocused && usePlayerStore.getState().status === 'playing') fadeIn();
  }, [isFocused, fadeIn]);

  return (
    <View style={[styles.screen, { backgroundColor: darkMode ? '#02030A' : '#F0A45B' }]}>
      {isFocused && <StatusBar style={colors.bar} />}

      {isFocused ? (
        <View style={StyleSheet.absoluteFill}>
          <EarthGlobe height={screenH} mode={mode} playing={isPlaying} />
        </View>
      ) : null}

      <SafeAreaView style={styles.content} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <IconButton icon="settings" label="Open settings" glass onPress={() => router.push('/settings')} />
        </View>

        <View style={styles.spacer} pointerEvents="none" />

        {track && (
          <View style={styles.nowPlaying} pointerEvents="none">
            <Text
              style={[styles.trackTitle, { color: colors.text, fontSize: titleSize }]}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            <Text style={[styles.trackArtist, { color: colors.muted }]} numberOfLines={1}>
              {track.artist}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  spacer: {
    flex: 1,
  },
  nowPlaying: {
    alignItems: 'center',
    paddingBottom: 106,
    paddingHorizontal: 32,
    gap: 5,
  },
  trackTitle: {
    fontFamily: font.display,
    letterSpacing: -0.5,
    textAlign: 'center',
    maxWidth: '92%',
  },
  trackArtist: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
