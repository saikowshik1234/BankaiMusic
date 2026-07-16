/**
 * Horizontal card shelf at the top of the Library: Favourites, a New
 * Playlist card, then one card per saved playlist. Exactly two cards show
 * at a time; you slide sideways for the rest. Each snap ticks a haptic.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { font, palette } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

export interface ShelfPlaylist {
  id: string;
  name: string;
  count: number;
}

interface LibraryShelfProps {
  favouritesCount: number;
  playlists: ShelfPlaylist[];
  activeKey: string; // 'all' | 'favourites' | playlist id
  onSelectFavourites: () => void;
  onSelectPlaylist: (id: string) => void;
  onCreate: () => void;
  onDeletePlaylist: (id: string) => void;
}

const SIDE_PAD = 20;
const GAP = 12;

export function LibraryShelf({
  favouritesCount,
  playlists,
  activeKey,
  onSelectFavourites,
  onSelectPlaylist,
  onCreate,
  onDeletePlaylist,
}: LibraryShelfProps) {
  const theme = useThemeColors();
  const isDark = theme.statusBar === 'light';
  const { width } = useWindowDimensions();
  const cardW = Math.round((width - SIDE_PAD * 2 - GAP) / 2);
  const step = cardW + GAP;
  const lastIndex = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / step);
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      if (useSettingsStore.getState().hapticsEnabled) void Haptics.selectionAsync();
    }
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.07)' : theme.surface;
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : theme.hairline;

  const renderCard = (
    key: string,
    label: string,
    sub: string,
    icon: keyof typeof MaterialIcons.glyphMap,
    onPress: () => void,
    accent: string,
    onLongPress?: () => void,
  ) => {
    const active = activeKey === key;
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.card,
          {
            width: cardW,
            backgroundColor: cardBg,
            borderColor: active ? palette.coral : cardBorder,
            borderWidth: active ? 2 : 1,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: accent }]}>
          <MaterialIcons name={icon} size={20} color={palette.white} />
        </View>
        <Text style={[styles.cardLabel, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.cardSub, { color: theme.textFaint }]} numberOfLines={1}>
          {sub}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={step}
      decelerationRate="fast"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.content}
      style={styles.shelf}
    >
      {renderCard(
        'favourites',
        'Favourites',
        `${favouritesCount} ${favouritesCount === 1 ? 'song' : 'songs'}`,
        'favorite',
        onSelectFavourites,
        palette.coral,
      )}
      {renderCard('new', 'New Playlist', 'Create one', 'add', onCreate, palette.cerulean)}
      {playlists.map((p) =>
        renderCard(
          p.id,
          p.name,
          `${p.count} ${p.count === 1 ? 'song' : 'songs'}`,
          'queue-music',
          () => onSelectPlaylist(p.id),
          palette.tiffany,
          () => onDeletePlaylist(p.id),
        ),
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shelf: {
    marginTop: 14,
    height: 92,     // pin to card height so it can't grow and steal list space
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: SIDE_PAD,
    gap: GAP,
  },
  card: {
    height: 92,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: font.bodyBold,
    fontSize: 15,
  },
  cardSub: {
    fontFamily: font.bodySemi,
    fontSize: 12,
  },
}); 
