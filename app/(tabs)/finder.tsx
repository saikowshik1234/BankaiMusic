import { MaterialIcons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  identifyClip,
  isRecognitionConfigured,
  type RecognizedSong,
} from '@/services/audio/recognitionService';
import { useFinderStore, type IdentifiedTrack } from '@/stores/finderStore';
import { font, palette, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

type Phase = 'idle' | 'listening' | 'identifying' | 'result' | 'error';
const LISTEN_MS = 8000;

function PulseRing({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - t.value) * 0.5,
    transform: [{ scale: 1 + t.value * 1.4 }],
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

export default function FinderScreen() {
  const isFocused = useIsFocused();
  const theme = useThemeColors();
  const isDark = theme.statusBar === 'light';
  
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [song, setSong] = useState<RecognizedSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const history = useFinderStore((s) => s.history);
  const addIdentification = useFinderStore((s) => s.addIdentification);
  const clearHistory = useFinderStore((s) => s.clearHistory);

  const start = async () => {
    setError(null);
    setSong(null);
    setPhase('listening');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone access is needed to identify a song.');

      await recorder.prepareToRecordAsync();
      recorder.record();
      await new Promise((resolve) => setTimeout(resolve, LISTEN_MS));
      await recorder.stop();
      setPhase('identifying');

      if (!recorder.uri) throw new Error('Recording failed — no audio was captured.');
      const result = await identifyClip(recorder.uri);
      
      if (result) {
        addIdentification(result);
      }
      
      setSong(result);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {isFocused && <StatusBar style={isDark ? 'light' : 'dark'} />}
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Music Finder</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.stage}>
            {phase === 'idle' && !isRecognitionConfigured() && (
              <>
                <MaterialIcons name="cloud-off" size={36} color={theme.textMuted} />
                <Text style={[styles.prompt, { color: theme.textMuted }]}>
                  Song ID isn't set up yet — deploy server/identify-proxy and add its URL/key to .env.
                </Text>
              </>
            )}

            {phase === 'idle' && isRecognitionConfigured() && (
              <>
                <Text style={[styles.prompt, { color: theme.text }]}>Play some music nearby and tap to identify it.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start listening"
                  onPress={() => void start()}
                  style={({ pressed }) => [styles.micButton, pressed && { opacity: 0.85 }]}
                >
                  <MaterialIcons name="mic" size={34} color={palette.white} />
                </Pressable>
              </>
            )}

            {phase === 'listening' && (
              <View style={styles.listeningWrap}>
                <PulseRing delay={0} />
                <PulseRing delay={600} />
                <PulseRing delay={1200} />
                <View style={styles.micButtonActive}>
                  <MaterialIcons name="mic" size={34} color={palette.white} />
                </View>
                <Text style={[styles.statusText, { color: theme.text }]}>Listening…</Text>
              </View>
            )}

            {phase === 'identifying' && (
              <View style={styles.listeningWrap}>
                <View style={styles.micButtonActive}>
                  <MaterialIcons name="graphic-eq" size={34} color={palette.white} />
                </View>
                <Text style={[styles.statusText, { color: theme.text }]}>Identifying…</Text>
              </View>
            )}

            {phase === 'result' && (
              <View style={styles.resultWrap}>
                {song ? (
                  <>
                    <MaterialIcons name="check-circle" size={40} color={palette.tiffany} />
                    <Text style={[styles.resultTitle, { color: theme.text }]}>{song.title}</Text>
                    <Text style={[styles.resultArtist, { color: theme.textMuted }]}>{song.artist}</Text>
                    {song.album && <Text style={[styles.resultAlbum, { color: theme.textFaint }]}>{song.album}</Text>}
                  </>
                ) : (
                  <>
                    <MaterialIcons name="help-outline" size={40} color={theme.textFaint} />
                    <Text style={[styles.resultTitle, { color: theme.text }]}>No match found</Text>
                    <Text style={[styles.resultArtist, { color: theme.textMuted }]}>Try getting closer to the speaker.</Text>
                  </>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPhase('idle');
                    setSong(null);
                  }}
                  style={({ pressed }) => [styles.retryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.retryText, { color: theme.text }]}>Back to Finder</Text>
                </Pressable>
              </View>
            )}

            {phase === 'error' && (
              <View style={styles.resultWrap}>
                <MaterialIcons name="error-outline" size={40} color="#FF9B9B" />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPhase('idle');
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.retryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.retryText, { color: theme.text }]}>Try again</Text>
                </Pressable>
              </View>
            )}
          </View>

          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Discoveries</Text>
                <Pressable hitSlop={10} onPress={clearHistory}>
                  <Text style={[styles.clearText, { color: palette.coral }]}>Clear</Text>
                </Pressable>
              </View>
              
              {history.map((item) => (
                <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.hairline }]}>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.historyArtist, { color: theme.textMuted }]} numberOfLines={1}>{item.artist}</Text>
                  </View>
                  <View style={styles.historyActions}>
                    {item.spotifyUrl && (
                      <Pressable onPress={() => void Linking.openURL(item.spotifyUrl!)} style={styles.serviceLink}>
                        <Text style={[styles.serviceText, { color: palette.tiffany }]}>Spotify</Text>
                      </Pressable>
                    )}
                    {item.appleMusicUrl && (
                      <Pressable onPress={() => void Linking.openURL(item.appleMusicUrl!)} style={styles.serviceLink}>
                        <Text style={[styles.serviceText, { color: palette.coral }]}>Apple</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 20,
  },
  headerTitle: { fontFamily: font.display, fontSize: 30, letterSpacing: -0.6 },
  scrollContent: {
    paddingBottom: 120, // space for nav bar
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  prompt: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  micButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.coral,
    shadowColor: palette.coral,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  micButtonActive: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.coral,
  },
  listeningWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    height: 200,
  },
  ring: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: palette.coral,
  },
  statusText: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  resultWrap: {
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontFamily: font.display,
    fontSize: 24,
    textAlign: 'center',
    marginTop: 8,
  },
  resultArtist: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    textAlign: 'center',
  },
  resultAlbum: {
    fontFamily: font.body,
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontFamily: font.bodyBold, fontSize: 13 },
  errorText: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    lineHeight: 21,
    color: '#FF9B9B',
    textAlign: 'center',
  },
  historySection: {
    paddingHorizontal: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: font.bodyBold,
    fontSize: 18,
  },
  clearText: {
    fontFamily: font.bodyBold,
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyInfo: {
    flex: 1,
    paddingRight: 16,
  },
  historyTitle: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    marginBottom: 2,
  },
  historyArtist: {
    fontFamily: font.body,
    fontSize: 13,
  },
  historyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  serviceText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
  },
});
