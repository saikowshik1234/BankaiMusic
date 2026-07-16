/**
 * Onboarding / connect sources — teal gradient slide-up overlay.
 * "Scan device" and "Streaming services" (-> /connect) are both live.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { useLibraryStore } from '@/stores/libraryStore';
import { font, gradients, palette, radius, spacing } from '@/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

function SourceRow({
  icon,
  iconBg,
  title,
  sub,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  iconBg: readonly [string, string];
  title: string;
  sub: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.sourceRow, disabled && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={[iconBg[0], iconBg[1]]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.sourceIcon}
      >
        <MaterialIcons name={icon} size={24} color={palette.white} />
      </LinearGradient>
      <View style={styles.sourceText}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <Text style={styles.sourceSub}>{sub}</Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={disabled ? palette.iconFaint : palette.coral}
      />
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const requestAndScan = useLibraryStore((s) => s.requestAndScan);
  const importFiles = useLibraryStore((s) => s.importFiles);

  const scanAndClose = async () => {
    await requestAndScan();
    router.back();
  };

  const importAndClose = async () => {
    const count = await importFiles();
    if (count > 0) router.back();
  };

  return (
    <LinearGradient
      colors={[...gradients.onboarding]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.bg}
    >
      {/* soft background circles */}
      <View style={[styles.circle, styles.circleWarm]} />
      <View style={[styles.circle, styles.circleCoral]} />

      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.close}>
          <IconButton icon="close" label="Close" glass onPress={() => router.back()} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.kicker}>GET STARTED</Text>
          <Text style={styles.title}>Bring all your{'\n'}music together</Text>
          <Text style={styles.body}>
            Play downloaded MP3s offline, or connect a streaming service to hand
            playback to its own app and import your playlists.
          </Text>
        </View>

        <View style={styles.sources}>
          <SourceRow
            icon="library-add"
            iconBg={[palette.coral, '#E14E55']}
            title="Import audio files"
            sub="Pick MP3s from your Files app"
            onPress={() => void importAndClose()}
          />
          <SourceRow
            icon="folder-open"
            iconBg={[palette.tiffany, palette.cerulean]}
            title="Scan device"
            sub="Find music on Android storage"
            onPress={() => void scanAndClose()}
          />
          <SourceRow
            icon="cloud-queue"
            iconBg={['#8A95A0', '#5C6A72']}
            title="Streaming services"
            sub="Connect Spotify, YouTube Music, Apple Music"
            onPress={() => router.push('/connect')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>Start listening</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  screen: {
    flex: 1,
    paddingHorizontal: 28,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleWarm: {
    width: 300,
    height: 300,
    right: -80,
    top: -60,
    backgroundColor: 'rgba(255,203,119,0.27)',
  },
  circleCoral: {
    width: 240,
    height: 240,
    left: -70,
    bottom: 120,
    backgroundColor: 'rgba(254,109,115,0.33)',
  },
  close: {
    paddingTop: spacing.m,
    alignSelf: 'flex-start',
  },
  copy: {
    marginTop: 26,
  },
  kicker: {
    fontFamily: font.bodyExtraBold,
    fontSize: 12,
    letterSpacing: 1.9,
    color: palette.white,
    opacity: 0.8,
  },
  title: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.7,
    color: palette.white,
    marginTop: 6,
  },
  body: {
    fontFamily: font.body,
    fontSize: 14.5,
    lineHeight: 22.5,
    color: palette.white,
    opacity: 0.9,
    marginTop: 12,
  },
  sources: {
    marginTop: 26,
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.white,
    borderRadius: radius.cardLarge,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: {
    flex: 1,
    minWidth: 0,
  },
  sourceTitle: {
    fontFamily: font.display,
    fontSize: 16,
    color: palette.ink,
  },
  sourceSub: {
    fontFamily: font.bodySemi,
    fontSize: 12,
    color: palette.muted2,
  },
  cta: {
    marginTop: 'auto',
    marginBottom: 6,
    borderRadius: 18,
    backgroundColor: palette.ink,
    padding: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: font.display,
    fontSize: 16,
    color: palette.white,
  },
});
