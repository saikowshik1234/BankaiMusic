/**
 * Settings — slide-up overlay. Theme-aware; hosts the Appearance toggle.
 * Groups: PLAYBACK / SOURCES / GENERAL.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { font, gradients, palette, radius, shadows, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

// TODO before store submission: replace with the real hosted privacy policy URL.
// Both App Store and Play Store require a reachable privacy policy link.
const PRIVACY_POLICY_URL = 'https://example.com/vinyl/privacy';

type IconName = keyof typeof MaterialIcons.glyphMap;

function ThemedSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: palette.coral, false: '#5C646B' }}
      thumbColor={palette.white}
    />
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const crossfadeEnabled = useSettingsStore((s) => s.crossfadeEnabled);
  const setCrossfadeEnabled = useSettingsStore((s) => s.setCrossfadeEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const uiSoundsEnabled = useSettingsStore((s) => s.uiSoundsEnabled);
  const setUiSoundsEnabled = useSettingsStore((s) => s.setUiSoundsEnabled);
  const rescan = useLibraryStore((s) => s.rescan);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const trackCount = useLibraryStore((s) => s.tracks.length);

  const Row = ({
    icon,
    iconColor,
    title,
    sub,
    onPress,
    trailing,
    last = false,
  }: {
    icon: IconName;
    iconColor: string;
    title: string;
    sub?: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
    last?: boolean;
  }) => {
    const content = (
      <>
        <MaterialIcons name={icon} size={24} color={iconColor} />
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
          {sub ? <Text style={[styles.rowSub, { color: theme.textFaint }]}>{sub}</Text> : null}
        </View>
        {trailing ?? <MaterialIcons name="chevron-right" size={22} color={theme.textFaint} />}
      </>
    );
    return (
      <>
        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={title}
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            {content}
          </Pressable>
        ) : (
          <View style={styles.row}>{content}</View>
        )}
        {!last && <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />}
      </>
    );
  };

  const GroupLabel = ({ text, color }: { text: string; color: string }) => (
    <Text style={[styles.groupLabel, { color }]}>{text}</Text>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Close settings" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <GroupLabel text="APPEARANCE" color={palette.cerulean} />
        <View style={[styles.group, { backgroundColor: theme.surface }]}>
          <Row
            icon="dark-mode"
            iconColor={palette.cerulean}
            title="Dark mode"
            sub="Pure black, records glow"
            last
            trailing={<ThemedSwitch value={darkMode} onValueChange={setDarkMode} />}
          />
        </View>

        <GroupLabel text="PLAYBACK" color={palette.tiffany} />
        <View style={[styles.group, { backgroundColor: theme.surface }]}>
          <Row icon="high-quality" iconColor={palette.cerulean} title="Audio quality" sub="Original file quality" />
          <Row
            icon="vibration"
            iconColor={palette.cerulean}
            title="Haptic feedback"
            sub="Feel the record under your finger"
            trailing={<ThemedSwitch value={hapticsEnabled} onValueChange={setHapticsEnabled} />}
          />
          <Row
            icon="volume-up"
            iconColor={palette.tiffany}
            title="Interface sounds"
            sub="Clicks and record whoosh on controls"
            trailing={<ThemedSwitch value={uiSoundsEnabled} onValueChange={setUiSoundsEnabled} />}
          />
          <Row
            icon="blur-on"
            iconColor={palette.coral}
            title="Crossfade"
            sub="Blend tracks over 6s"
            last
            trailing={<ThemedSwitch value={crossfadeEnabled} onValueChange={setCrossfadeEnabled} />}
          />
        </View>

        <GroupLabel text="SOURCES" color={palette.sunsetText} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect a service"
          onPress={() => router.push('/onboarding')}
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
        >
          <LinearGradient
            colors={[gradients.connectCard[0], gradients.connectCard[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.connectCard}
          >
            <MaterialIcons name="add-circle" size={26} color={palette.white} />
            <View style={styles.rowText}>
              <Text style={styles.connectTitle}>Connect a service</Text>
              <Text style={styles.connectSub}>Spotify, YouTube Music, Apple Music</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={palette.white} />
          </LinearGradient>
        </Pressable>

        <GroupLabel text="GENERAL" color={palette.cerulean} />
        <View style={[styles.group, { backgroundColor: theme.surface }]}>
          <Row
            icon="sd-storage"
            iconColor={palette.tiffany}
            title="Library"
            sub={isScanning ? 'Scanning…' : `${trackCount} tracks — tap to rescan`}
            onPress={() => void rescan()}
          />
          <Row
            icon="policy"
            iconColor={palette.coral}
            title="Privacy policy"
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
          <Row icon="info" iconColor={palette.coral} title="About BankaiMusic" sub="v1.0.0" last trailing={<View />} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 26,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
  },
  groupLabel: {
    fontFamily: font.bodyExtraBold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  group: {
    borderRadius: radius.cardLarge,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowTitle: {
    fontFamily: font.bodyBold,
    fontSize: 15,
  },
  rowSub: {
    fontFamily: font.bodySemi,
    fontSize: 12,
  },
  hairline: {
    height: 1,
    marginHorizontal: 16,
  },
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.cardLarge,
    shadowColor: palette.coral,
    shadowOpacity: 0.3,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  connectTitle: {
    fontFamily: font.display,
    fontSize: 16,
    color: palette.white,
  },
  connectSub: {
    fontFamily: font.bodySemi,
    fontSize: 12,
    color: palette.white,
    opacity: 0.92,
  },
});
