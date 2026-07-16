/**
 * Library — vertical "coverflow" list (design.json v4 > screens.library).
 * Plain RN views + Reanimated only, no GL: items shrink/fade/tilt the
 * further they sit from the centered focal row, which is the only one
 * that's fully opaque and carries the Play action. Distance is derived
 * straight from scroll offset on the UI thread — nothing re-renders on
 * scroll, and Animated.FlatList windows/recycles rows for us so a library
 * of thousands of tracks stays cheap (no manual virtualization needed).
 *
 * Deliberately skips real per-row blur (CSS spec's `filter: blur`): native
 * blur views per row would mean dozens of live BlurView layers animating
 * every frame. Opacity + scale + a desaturation wash reads as "receding"
 * for a fraction of the GPU cost.
 */
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { coverGradient, font, palette } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

export interface CoverflowItem {
  id: string;
  title: string;
  subtitle: string;
  artworkUri?: string;
}

interface CoverflowListProps {
  items: CoverflowItem[];
  playingId?: string;
  height: number;
  onCenterChange?: (index: number) => void;
  onPlay: (index: number) => void;
  onItemLongPress?: (index: number) => void;
}

export const ITEM_HEIGHT = 86;
const MAX_STEP = 3;

function fmtDistance(scrollY: number, index: number) {
  'worklet'; // called from useDerivedValue on the UI thread — without this
  // directive the first rendered row crashes (see CLAUDE.md gotchas)
  return scrollY / ITEM_HEIGHT - index;
}

const Art = memo(function Art({
  uri,
  colorSeed,
  distance,
  dimColor,
}: {
  uri?: string;
  colorSeed: string;
  distance: SharedValue<number>;
  dimColor: string;
}) {
  const style = useAnimatedStyle(() => {
    const absD = Math.min(MAX_STEP, Math.abs(distance.value));
    const size = interpolate(absD, [0, 1], [64, 56], Extrapolation.CLAMP);
    return { width: size, height: size, borderRadius: size / 2 };
  });
  const dimStyle = useAnimatedStyle(() => {
    const absD = Math.min(MAX_STEP, Math.abs(distance.value));
    return { opacity: interpolate(absD, [0, MAX_STEP], [0, 0.65], Extrapolation.CLAMP) };
  });
  const [start, end] = coverGradient(colorSeed);

  return (
    <Animated.View style={[styles.artWrap, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.artImage} />
      ) : (
        <LinearGradient colors={[start, end]} style={styles.artImage} />
      )}
      <Animated.View pointerEvents="none" style={[styles.artDim, { backgroundColor: dimColor }, dimStyle]} />
    </Animated.View>
  );
});

interface RowColors {
  title: string;
  subtitle: string;
  wash: string;
  dim: string;
}

interface RowProps {
  item: CoverflowItem;
  index: number;
  scrollY: SharedValue<number>;
  isPlaying: boolean;
  colors: RowColors;
  onPlay: (index: number) => void;
  onItemLongPress?: (index: number) => void;
}

const Row = memo(function Row({ item, index, scrollY, isPlaying, colors, onPlay, onItemLongPress }: RowProps) {
  // computed once per scroll frame on the UI thread; every dependent style
  // below reads this instead of re-deriving it from scrollY + index.
  const distance = useDerivedValue(() => fmtDistance(scrollY.value, index));

  const rowStyle = useAnimatedStyle(() => {
    const d = distance.value;
    const absD = Math.min(MAX_STEP, Math.abs(d));
    const scale = interpolate(absD, [0, MAX_STEP], [1, 1 - 0.09 * MAX_STEP], Extrapolation.CLAMP);
    const opacity = interpolate(absD, [0, MAX_STEP], [1, 0.06], Extrapolation.CLAMP);
    const rotateX = interpolate(d, [-MAX_STEP, MAX_STEP], [MAX_STEP * 6, -MAX_STEP * 6], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 800 }, { rotateX: `${rotateX}deg` }, { scale }],
    };
  });

  const washStyle = useAnimatedStyle(() => {
    const absD = Math.min(1, Math.abs(distance.value));
    return { opacity: interpolate(absD, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP) };
  });

  const titleStyle = useAnimatedStyle(() => {
    const absD = Math.min(1, Math.abs(distance.value));
    return { fontSize: interpolate(absD, [0, 1], [19, 17], Extrapolation.CLAMP) };
  });

  const handlePress = useCallback(() => {
    const d = Math.abs(scrollY.value / ITEM_HEIGHT - index);
    if (d > 0.5) return;
    onPlay(index);
  }, [scrollY, index, onPlay]);

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <Animated.View pointerEvents="none" style={[styles.wash, { backgroundColor: colors.wash }, washStyle]} />
      <Art uri={item.artworkUri} colorSeed={item.id} distance={distance} dimColor={colors.dim} />
      <Pressable
        style={styles.meta}
        onLongPress={() => onItemLongPress?.(index)}
        delayLongPress={300}
        accessibilityLabel={`${item.title} options`}
      >
        <Animated.Text style={[styles.title, { color: colors.title }, titleStyle]} numberOfLines={1}>
          {item.title}
        </Animated.Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </Pressable>
      <Animated.View style={[styles.actionWrap, washStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.title}`}
          hitSlop={8}
          onPress={handlePress}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
        >
          <MaterialIcons
            name={isPlaying ? 'graphic-eq' : 'play-arrow'}
            size={16}
            color={palette.white}
          />
          <Text style={styles.actionText}>{isPlaying ? 'Playing' : 'Play'}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

function scrollTick() {
  if (useSettingsStore.getState().hapticsEnabled) {
    void Haptics.selectionAsync();
  }
}

export function CoverflowList({ items, playingId, height, onCenterChange, onPlay, onItemLongPress }: CoverflowListProps) {
  const theme = useThemeColors();
  const isDark = theme.statusBar === 'light';
  const rowColors: RowColors = {
    title: theme.text,
    subtitle: isDark ? 'rgba(255,255,255,0.5)' : theme.textFaint,
    wash: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(23,23,26,0.05)',
    dim: theme.bg,
  };
  const scrollY = useSharedValue(0);
  const lastReported = useSharedValue(-1);
  const padding = Math.max(0, (height - ITEM_HEIGHT) / 2);

  const lastTicked = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      // detent feel: one selection tick each time a row crosses the center
      const idx = Math.round(e.contentOffset.y / ITEM_HEIGHT);
      if (idx !== lastTicked.value) {
        lastTicked.value = idx;
        runOnJS(scrollTick)();
      }
    },
    onMomentumEnd: (e) => {
      if (!onCenterChange) return;
      const idx = Math.round(e.contentOffset.y / ITEM_HEIGHT);
      if (idx !== lastReported.value) {
        lastReported.value = idx;
        runOnJS(onCenterChange)(idx);
      }
    },
  });

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CoverflowItem>) => (
      <Row item={item} index={index} scrollY={scrollY} isPlaying={item.id === playingId} colors={rowColors} onPlay={onPlay} onItemLongPress={onItemLongPress} />
    ),
    [scrollY, playingId, onPlay, onItemLongPress, rowColors],
  );

  return (
    <View style={{ height }}>
      <Animated.FlatList
        data={items}
        keyExtractor={(item: CoverflowItem) => item.id}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: padding + ITEM_HEIGHT * index, index })}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: padding }}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 28,
  },
  wash: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 4,
    bottom: 4,
    borderRadius: 22,
  },
  artWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  artDim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: font.bodyBold,
  },
  subtitle: {
    fontFamily: font.bodySemi,
    fontSize: 13,
  },
  actionWrap: {
    flex: 0,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 999,
    backgroundColor: palette.coral,
  },
  actionText: {
    fontFamily: font.bodyBold,
    fontSize: 13,
    color: palette.white,
  },
});
