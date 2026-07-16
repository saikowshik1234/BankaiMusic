/**
 * Library — vertical coverflow list (design.json > screens.library).
 * Black stage. Title + search + add, then a horizontal shelf (Favourites,
 * New Playlist, saved playlists) and the coverflow list of the selected
 * collection. Long-press a song to add it to a playlist.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverflowList, ITEM_HEIGHT, type CoverflowItem } from '@/components/CoverflowList';
import { LibraryShelf } from '@/components/LibraryShelf';
import { selectVisibleTracks, useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistStore } from '@/stores/playlistStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { font, palette } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';
import type { Track } from '@/types';

function fmt(sec: number): string {
  if (!sec || sec <= 0) return '';
  const s = Math.floor(sec);
  return ` · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Collection = { type: 'all' | 'favourites' | 'playlist'; id?: string };

export default function LibraryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useThemeColors();
  const isDark = theme.statusBar === 'light';
  const { height: screenH } = useWindowDimensions();
  const allTracks = useLibraryStore((s) => s.tracks);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const checkPermission = useLibraryStore((s) => s.checkPermission);
  const requestAndScan = useLibraryStore((s) => s.requestAndScan);
  const importFiles = useLibraryStore((s) => s.importFiles);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const currentTrack = usePlayerStore((s) => s.currentTrack());
  const liked = usePlayerStore((s) => s.liked);

  const playlists = usePlaylistStore((s) => s.playlists);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrack);

  const [collection, setCollection] = useState<Collection>({ type: 'all' });
  const [namingVisible, setNamingVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [addAfterCreate, setAddAfterCreate] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<Track | null>(null);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  // derive OUTSIDE the selector (see libraryStore.ts note)
  const tracks = useMemo(
    () => selectVisibleTracks(allTracks, 'recent', searchQuery),
    [allTracks, searchQuery],
  );

  const collectionTracks = useMemo(() => {
    if (collection.type === 'favourites') return tracks.filter((t) => liked[t.id]);
    if (collection.type === 'playlist') {
      const pl = playlists.find((p) => p.id === collection.id);
      if (!pl) return [];
      const byId = new Map(tracks.map((t) => [t.id, t]));
      return pl.trackIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
    }
    return tracks;
  }, [collection, tracks, liked, playlists]);

  const items: CoverflowItem[] = useMemo(
    () =>
      collectionTracks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: `${t.artist}${fmt(t.duration)}`,
        artworkUri: t.artworkUri,
      })),
    [collectionTracks],
  );

  const favouritesCount = useMemo(
    () => allTracks.filter((t) => liked[t.id]).length,
    [allTracks, liked],
  );

  const shelfPlaylists = useMemo(
    () => playlists.map((p) => ({ id: p.id, name: p.name, count: p.trackIds.length })),
    [playlists],
  );

  const activeKey = collection.type === 'playlist' ? (collection.id ?? '') : collection.type;

  const collectionName =
    collection.type === 'favourites'
      ? 'Favourites'
      : collection.type === 'playlist'
        ? (playlists.find((p) => p.id === collection.id)?.name ?? 'Playlist')
        : '';

  const insets = useSafeAreaInsets();
  // reserve room for the floating nav pill so songs centre between the
  // cards above and the dashboard below (not behind it)
  const navClearance = Math.max(16, insets.bottom) + 66 + 12;
  // fixed, centred block of up to ~5 rows; justifyContent centres it in the
  // space between the cards and the nav (applies to All / Favourites / any playlist)
  const listH = Math.round(Math.min(screenH * 0.46, ITEM_HEIGHT * 5));

  const confirmAdd = () => {
    if (useSettingsStore.getState().hapticsEnabled) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openNaming = (trackId: string | null) => {
    setAddAfterCreate(trackId);
    setNewName('');
    setNamingVisible(true);
  };

  const submitNaming = () => {
    const id = createPlaylist(newName);
    if (addAfterCreate) addTrackToPlaylist(id, addAfterCreate);
    setNamingVisible(false);
    setAddAfterCreate(null);
    setNewName('');
    setCollection({ type: 'playlist', id });
    confirmAdd();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {isFocused && <StatusBar style={isDark ? 'light' : 'dark'} />}
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Library</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Music Finder"
              hitSlop={10}
              onPress={() => router.push('/finder')}
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.55 }]}
            >
              <MaterialIcons name="mic" size={24} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add songs"
              hitSlop={10}
              onPress={() => void importFiles()}
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.55 }]}
            >
              <MaterialIcons name="add" size={26} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.searchField,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.hairline,
            },
          ]}
        >
          <MaterialIcons name="search" size={20} color={theme.textFaint} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search your library"
            placeholderTextColor={theme.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search your library"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={palette.coral} />
            </Pressable>
          )}
        </View>

        <LibraryShelf
          favouritesCount={favouritesCount}
          playlists={shelfPlaylists}
          activeKey={activeKey}
          onSelectFavourites={() =>
            setCollection((c) => (c.type === 'favourites' ? { type: 'all' } : { type: 'favourites' }))
          }
          onSelectPlaylist={(id) =>
            setCollection((c) =>
              c.type === 'playlist' && c.id === id ? { type: 'all' } : { type: 'playlist', id },
            )
          }
          onCreate={() => openNaming(null)}
          onDeletePlaylist={(id) => {
            deletePlaylist(id);
            setCollection((c) => (c.type === 'playlist' && c.id === id ? { type: 'all' } : c));
          }}
        />

        {collection.type !== 'all' && (
          <View style={styles.collectionBar}>
            <Text style={[styles.collectionName, { color: theme.text }]} numberOfLines={1}>
              {collectionName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show all songs"
              hitSlop={8}
              onPress={() => setCollection({ type: 'all' })}
            >
              <Text style={[styles.collectionReset, { color: palette.coral }]}>All songs</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.listArea, { paddingBottom: navClearance }]}>
        {items.length > 0 ? (
          <CoverflowList
            items={items}
            playingId={currentTrack?.id}
            height={listH}
            onPlay={(index) => {
              void playQueue(collectionTracks, index);
              router.navigate('/');
            }}
            onItemLongPress={(index) => setAddTarget(collectionTracks[index] ?? null)}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {collection.type === 'favourites'
                ? 'No favourites yet'
                : collection.type === 'playlist'
                  ? 'This playlist is empty'
                  : isScanning
                    ? 'Looking for your music…'
                    : searchQuery
                      ? `Nothing matches “${searchQuery.trim()}”`
                      : 'Your library is empty'}
            </Text>
            {collection.type === 'favourites' && (
              <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                Tap the heart on a track while it plays to add it here.
              </Text>
            )}
            {collection.type === 'playlist' && (
              <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                Long-press any song in your library to add it to this playlist.
              </Text>
            )}
            {collection.type === 'all' && !isScanning && !searchQuery && (
              <>
                <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
                  Drop MP3s into the VINYL folder in your Files app and they appear
                  here automatically — or add them now.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void importFiles()}
                  style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.emptyButtonText}>Add songs</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void requestAndScan()}
                  style={({ pressed }) => [styles.emptyGhost, pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.emptyGhostText, { color: theme.textFaint }]}>Scan device (Android)</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
        </View>
      </SafeAreaView>

      {/* New-playlist naming modal */}
      <Modal visible={namingVisible} transparent animationType="fade" onRequestClose={() => setNamingVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNamingVisible(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>New playlist</Text>
            <TextInput
              style={[styles.dialogInput, { color: theme.text, borderColor: theme.hairline }]}
              placeholder="Playlist name"
              placeholderTextColor={theme.textFaint}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitNaming}
            />
            <View style={styles.dialogRow}>
              <Pressable hitSlop={8} onPress={() => setNamingVisible(false)}>
                <Text style={[styles.dialogCancel, { color: theme.textMuted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.dialogCreate, pressed && { opacity: 0.85 }]}
                onPress={submitNaming}
              >
                <Text style={styles.dialogCreateText}>Create</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add-to-playlist sheet */}
      <Modal visible={addTarget !== null} transparent animationType="slide" onRequestClose={() => setAddTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAddTarget(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              Add “{addTarget?.title}” to…
            </Text>
            {playlists.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  if (addTarget) addTrackToPlaylist(p.id, addTarget.id);
                  setAddTarget(null);
                  confirmAdd();
                }}
              >
                <MaterialIcons name="queue-music" size={20} color={theme.textMuted} />
                <Text style={[styles.sheetRowText, { color: theme.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.6 }]}
              onPress={() => {
                const t = addTarget;
                setAddTarget(null);
                openNaming(t?.id ?? null);
              }}
            >
              <MaterialIcons name="add" size={20} color={palette.coral} />
              <Text style={[styles.sheetRowText, { color: palette.coral }]}>New playlist…</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerTitle: {
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    marginTop: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.bodySemi,
    fontSize: 14,
  },
  collectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 4,
  },
  collectionName: {
    fontFamily: font.display,
    fontSize: 18,
    flex: 1,
  },
  collectionReset: {
    fontFamily: font.bodyBold,
    fontSize: 13,
  },
  listArea: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 96,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: 22,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: palette.coral,
    borderRadius: 999,
    paddingHorizontal: 32,
    height: 48,
    justifyContent: 'center',
  },
  emptyButtonText: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: palette.white,
  },
  emptyGhost: {
    paddingVertical: 10,
  },
  emptyGhostText: {
    fontFamily: font.bodyBold,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  dialogTitle: {
    fontFamily: font.display,
    fontSize: 18,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 14,
    fontFamily: font.bodySemi,
    fontSize: 15,
  },
  dialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
  },
  dialogCancel: {
    fontFamily: font.bodyBold,
    fontSize: 15,
  },
  dialogCreate: {
    backgroundColor: palette.coral,
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 40,
    justifyContent: 'center',
  },
  dialogCreateText: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: palette.white,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: font.display,
    fontSize: 17,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 50,
  },
  sheetRowText: {
    fontFamily: font.bodySemi,
    fontSize: 15,
    flex: 1,
  },
});
