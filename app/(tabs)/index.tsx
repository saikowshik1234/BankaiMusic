/**
 * Now Playing — hero device screen. Theme-aware (light warm / pure-black dark).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { AnimatedVisualizer } from '@/components/AnimatedVisualizer';
import { usePlayerStore } from '@/stores/playerStore';
import { TurntableDevice } from '@/turntable/TurntableDevice';
import { font, palette, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

function SecondaryControls() {
  const router = useRouter();
  const theme = useThemeColors();
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  return (
    <View style={styles.secondary}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle shuffle"
        accessibilityState={{ selected: shuffle }}
        hitSlop={8}
        onPress={toggleShuffle}
        style={styles.secondaryButton}
      >
        <MaterialIcons name="shuffle" size={23} color={shuffle ? palette.tiffany : theme.textFaint} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Repeat: ${repeat}`}
        hitSlop={8}
        onPress={cycleRepeat}
        style={styles.secondaryButton}
      >
        <MaterialIcons
          name={repeat === 'one' ? 'repeat-one' : 'repeat'}
          size={23}
          color={repeat !== 'off' ? palette.coral : theme.textFaint}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open library"
        hitSlop={8}
        onPress={() => router.navigate('/library')}
        style={styles.secondaryButton}
      >
        <MaterialIcons name="library-music" size={23} color={theme.textFaint} />
      </Pressable>
    </View>
  );
}

export default function NowPlayingScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useThemeColors();
  const { height: screenH } = useWindowDimensions();
  const track = usePlayerStore((s) => s.currentTrack());
  const status = usePlayerStore((s) => s.status);
  const liked = usePlayerStore((s) => (track ? !!s.liked[track.id] : false));
  const toggleLike = usePlayerStore((s) => s.toggleLike);
  const [showVisualizer, setShowVisualizer] = useState(false);

  return (
    <LinearGradient
      colors={[...theme.bgGradient]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.topBar}>
          <IconButton icon="expand-more" label="Open library" onPress={() => router.navigate('/library')} />
          <View style={styles.topCenter}>
            <Text style={[styles.kicker, { color: theme.textFaint }]}>NOW PLAYING</Text>
            <Text style={[styles.albumLabel, { color: theme.textMuted }]} numberOfLines={1}>
              {track?.album ?? 'Offline'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showVisualizer ? 'Show turntable' : 'Show visualizer'}
              accessibilityState={{ selected: showVisualizer }}
              hitSlop={8}
              onPress={() => setShowVisualizer((v) => !v)}
              style={styles.visualizerToggle}
            >
              <MaterialIcons
                name="graphic-eq"
                size={20}
                color={showVisualizer ? palette.coral : theme.textFaint}
              />
            </Pressable>
            <IconButton icon="more-horiz" label="Open settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

        <View style={styles.stage}>
          {showVisualizer ? (
            isFocused ? (
              <AnimatedVisualizer height={Math.round(screenH * 0.42)} isPlaying={status === 'playing'} />
            ) : (
              <View style={{ height: Math.round(screenH * 0.42) }} />
            )
          ) : (
            <TurntableDevice />
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <View style={styles.metaText}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {track?.title ?? 'Nothing playing'}
              </Text>
              <Text style={[styles.artist, { color: theme.textMuted }]} numberOfLines={1}>
                {track?.artist ?? 'Pick a record from your library'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Unlike this song' : 'Like this song'}
              onPress={() => toggleLike()}
              style={({ pressed }) => [
                styles.likeButton,
                { backgroundColor: theme.surface },
                pressed && { transform: [{ scale: 0.92 }] },
              ]}
            >
              <MaterialIcons
                name={liked ? 'favorite' : 'favorite-border'}
                size={24}
                color={liked ? palette.coral : theme.textFaint}
              />
            </Pressable>
          </View>

          <View style={styles.progress}>
            <ProgressBar />
          </View>

          <SecondaryControls />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
  topCenter: {
    alignItems: 'center',
    gap: 3,
  },
  kicker: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 3.4,
  },
  albumLabel: {
    fontFamily: font.bodySemi,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.m,
  },
  visualizerToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 100,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: font.display,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  artist: {
    fontFamily: font.bodySemi,
    fontSize: 14,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E2832',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: -7, height: 11 },
  },
  progress: {
    marginTop: 20,
  },
  secondary: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
