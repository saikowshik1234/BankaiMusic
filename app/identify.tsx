/**
 * Song ID — "what's this song" (design.json v4 > screens.identify).
 * Slide-up modal, pure black stage to match Library/You. Records a short
 * clip and sends it to the identify proxy (src/services/audio/recognitionService.ts,
 * server/identify-proxy/) — the only feature in the app that needs network
 * access, since there's no offline fingerprint database for arbitrary
 * commercial music.
 */
import { MaterialIcons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { IconButton } from '@/components/IconButton';
import {
  identifyClip,
  isRecognitionConfigured,
  type RecognizedSong,
} from '@/services/audio/recognitionService';
import { font, palette, spacing } from '@/theme';

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

export default function IdentifyScreen() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [song, setSong] = useState<RecognizedSong | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setSong(result);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Close Song ID" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Song ID</Text>
      </View>

      <View style={styles.stage}>
        {phase === 'idle' && !isRecognitionConfigured() && (
          <>
            <MaterialIcons name="cloud-off" size={36} color="rgba(255,255,255,0.4)" />
            <Text style={styles.prompt}>
              Song ID isn't set up yet — deploy server/identify-proxy and add its URL/key to .env.
            </Text>
          </>
        )}

        {phase === 'idle' && isRecognitionConfigured() && (
          <>
            <Text style={styles.prompt}>Play some music nearby and tap to identify it.</Text>
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
            <Text style={styles.statusText}>Listening…</Text>
          </View>
        )}

        {phase === 'identifying' && (
          <View style={styles.listeningWrap}>
            <View style={styles.micButtonActive}>
              <MaterialIcons name="graphic-eq" size={34} color={palette.white} />
            </View>
            <Text style={styles.statusText}>Identifying…</Text>
          </View>
        )}

        {phase === 'result' && (
          <View style={styles.resultWrap}>
            {song ? (
              <>
                <MaterialIcons name="check-circle" size={40} color={palette.tiffany} />
                <Text style={styles.resultTitle}>{song.title}</Text>
                <Text style={styles.resultArtist}>{song.artist}</Text>
                {song.album && <Text style={styles.resultAlbum}>{song.album}</Text>}
                <View style={styles.linkRow}>
                  {song.spotifyUrl && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void Linking.openURL(song.spotifyUrl!)}
                      style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.linkButtonText}>Open in Spotify</Text>
                    </Pressable>
                  )}
                  {song.appleMusicUrl && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void Linking.openURL(song.appleMusicUrl!)}
                      style={({ pressed }) => [styles.linkButtonOutline, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.linkButtonOutlineText}>Open in Apple Music</Text>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <>
                <MaterialIcons name="help-outline" size={40} color="rgba(255,255,255,0.5)" />
                <Text style={styles.resultTitle}>No match found</Text>
                <Text style={styles.resultArtist}>Try getting closer to the speaker.</Text>
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => void start()}
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.retryText}>Listen again</Text>
            </Pressable>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.resultWrap}>
            <MaterialIcons name="error-outline" size={40} color="#FF9B9B" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void start()}
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
  },
  headerTitle: { fontFamily: font.display, fontSize: 22, color: palette.white },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  prompt: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  micButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.coral,
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
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  resultWrap: {
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontFamily: font.display,
    fontSize: 24,
    color: palette.white,
    textAlign: 'center',
    marginTop: 8,
  },
  resultArtist: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  resultAlbum: {
    fontFamily: font.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  linkButton: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.coral,
  },
  linkButtonText: { fontFamily: font.bodyBold, fontSize: 13, color: palette.white },
  linkButtonOutline: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  linkButtonOutlineText: { fontFamily: font.bodyBold, fontSize: 13, color: palette.white },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  retryText: { fontFamily: font.bodyBold, fontSize: 13, color: palette.white },
  errorText: {
    fontFamily: font.bodySemi,
    fontSize: 14,
    lineHeight: 21,
    color: '#FF9B9B',
    textAlign: 'center',
  },
});
