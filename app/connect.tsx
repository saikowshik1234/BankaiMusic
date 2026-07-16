/**
 * Connect a service — slide-up modal (design.json > screens.onboarding
 * pattern). Official remote-control + playlist metadata import only: no
 * audio is ever pulled from Spotify/Apple Music/YouTube Music into this
 * app (CLAUDE.md store-compliance rule). Connecting either opens the
 * track in that service's own app, or imports playlist track names to
 * match against the local library.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/IconButton';
import {
  connectors,
  matchRemoteTracks,
  openInAppleMusic,
  openInSpotify,
  openInYouTubeMusic,
  type ConnectService,
  type MatchResult,
  type RemotePlaylist,
} from '@/services/connect';
import { useConnectStore } from '@/stores/connectStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { font, palette, radius, spacing } from '@/theme';

const SERVICE_ORDER: ConnectService[] = ['spotify', 'youtubeMusic', 'appleMusic'];
/** flat badge color per service — deliberately generic, not the trademarked logos */
const SERVICE_COLOR: Record<ConnectService, string> = {
  spotify: '#1DB954',
  youtubeMusic: '#CC0000',
  appleMusic: '#FA233B',
};

async function openTrack(service: ConnectService, track: MatchResult['remote']) {
  if (service === 'spotify') return openInSpotify(track);
  if (service === 'youtubeMusic') return openInYouTubeMusic(track);
  return openInAppleMusic(track.title, track.artist);
}

export default function ConnectScreen() {
  const router = useRouter();
  const connected = useConnectStore((s) => s.connected);
  const connecting = useConnectStore((s) => s.connecting);
  const error = useConnectStore((s) => s.error);
  const connect = useConnectStore((s) => s.connect);
  const localTracks = useLibraryStore((s) => s.tracks);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const [activeService, setActiveService] = useState<ConnectService | null>(null);
  const [playlists, setPlaylists] = useState<RemotePlaylist[] | null>(null);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const openImport = async (service: ConnectService) => {
    setActiveService(service);
    setPlaylists(null);
    setResults(null);
    setImportError(null);
    setBusy(true);
    try {
      setPlaylists(await connectors[service].listPlaylists());
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const openPlaylist = async (service: ConnectService, playlistId: string) => {
    setBusy(true);
    setImportError(null);
    try {
      const remoteTracks = await connectors[service].listPlaylistTracks(playlistId);
      setResults(matchRemoteTracks(remoteTracks, localTracks));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const matchedCount = results?.filter((r) => r.local).length ?? 0;

  const playMatched = () => {
    if (!results) return;
    const queue = results.map((r) => r.local).filter((t): t is NonNullable<typeof t> => !!t);
    if (queue.length > 0) {
      void playQueue(queue, 0);
      router.navigate('/');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Close connect" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Connect a service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Play from a connected app, or import a playlist's track names to find matches
          already in your library. BankaiMusic never downloads or streams audio from these
          services — playback for anything not in your library happens in their own app.
        </Text>

        {SERVICE_ORDER.map((service) => {
          const connector = connectors[service];
          const isConnected = connected[service];
          const isConnecting = connecting === service;
          return (
            <View key={service} style={styles.card}>
              <View style={[styles.badge, { backgroundColor: SERVICE_COLOR[service] }]}>
                <MaterialIcons name="graphic-eq" size={22} color={palette.white} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{connector.displayName}</Text>
                <Text style={styles.cardSub}>
                  {connector.supportsImport ? 'Remote control + playlist import' : 'Open tracks in the app'}
                </Text>
              </View>
              {connector.supportsImport && isConnected ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openImport(service)}
                  style={({ pressed }) => [styles.cardAction, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.cardActionText}>Import</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={isConnecting}
                  onPress={() => void connect(service)}
                  style={({ pressed }) => [styles.cardAction, pressed && { opacity: 0.8 }]}
                >
                  {isConnecting ? (
                    <ActivityIndicator color={palette.white} size="small" />
                  ) : (
                    <Text style={styles.cardActionText}>Connect</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {activeService && (
          <View style={styles.importPanel}>
            <Text style={styles.importTitle}>{connectors[activeService].displayName} playlists</Text>
            {busy && <ActivityIndicator color={palette.coral} style={{ marginVertical: 16 }} />}
            {importError && <Text style={styles.errorText}>{importError}</Text>}

            {playlists && !results && (
              <View style={{ gap: 8 }}>
                {playlists.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    onPress={() => void openPlaylist(activeService, p.id)}
                    style={({ pressed }) => [styles.playlistRow, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.playlistName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.playlistCount}>{p.trackCount} tracks</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {results && (
              <View style={{ gap: 10 }}>
                <Text style={styles.resultsSummary}>
                  {matchedCount} of {results.length} tracks already in your library
                </Text>
                {matchedCount > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={playMatched}
                    style={({ pressed }) => [styles.playMatchedButton, pressed && { opacity: 0.85 }]}
                  >
                    <MaterialIcons name="play-arrow" size={18} color={palette.white} />
                    <Text style={styles.playMatchedText}>Play the {matchedCount} matched tracks</Text>
                  </Pressable>
                )}
                {results.map((r) => (
                  <View key={r.remote.id} style={styles.resultRow}>
                    <MaterialIcons
                      name={r.local ? 'check-circle' : 'radio-button-unchecked'}
                      size={18}
                      color={r.local ? palette.tiffany : 'rgba(255,255,255,0.35)'}
                    />
                    <View style={styles.resultText}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {r.remote.title}
                      </Text>
                      <Text style={styles.resultArtist} numberOfLines={1}>
                        {r.remote.artist}
                      </Text>
                    </View>
                    {!r.local && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${r.remote.title} in ${connectors[activeService].displayName}`}
                        onPress={() => void openTrack(activeService, r.remote)}
                        hitSlop={8}
                      >
                        <MaterialIcons name="open-in-new" size={18} color={palette.coral} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0C0E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: 12,
  },
  headerTitle: { fontFamily: font.display, fontSize: 22, color: palette.white },
  content: { paddingHorizontal: 20, paddingBottom: spacing.xl, gap: 14 },
  intro: {
    fontFamily: font.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.cardLarge,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0, gap: 1 },
  cardTitle: { fontFamily: font.bodyBold, fontSize: 15, color: palette.white },
  cardSub: { fontFamily: font.bodySemi, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardAction: {
    minWidth: 84,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: palette.coral,
  },
  cardActionText: { fontFamily: font.bodyBold, fontSize: 13, color: palette.white },
  errorText: {
    fontFamily: font.bodySemi,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#FF9B9B',
  },
  importPanel: {
    marginTop: 8,
    padding: 16,
    borderRadius: radius.cardLarge,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  importTitle: { fontFamily: font.bodyBold, fontSize: 14, color: palette.white },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  playlistName: { flex: 1, fontFamily: font.bodySemi, fontSize: 13.5, color: palette.white },
  playlistCount: { fontFamily: font.mono, fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  resultsSummary: { fontFamily: font.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  playMatchedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 999,
    backgroundColor: palette.tiffany,
  },
  playMatchedText: { fontFamily: font.bodyBold, fontSize: 13, color: palette.white },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultText: { flex: 1, minWidth: 0 },
  resultTitle: { fontFamily: font.bodySemi, fontSize: 13, color: palette.white },
  resultArtist: { fontFamily: font.body, fontSize: 11.5, color: 'rgba(255,255,255,0.45)' },
});
