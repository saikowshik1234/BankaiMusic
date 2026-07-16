/**
 * Floating pill tab bar — 3 tabs: Play / Library / You. Theme-aware.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, palette, radius, shadows } from '@/theme';
import { useThemeColors } from '@/theme/useTheme';

type IconName = keyof typeof MaterialIcons.glyphMap;

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Play', icon: 'album' },
  library: { label: 'Library', icon: 'library-music' },
  finder: { label: 'Finder', icon: 'search' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.bar,
        {
          bottom: Math.max(16, insets.bottom),
          backgroundColor: theme.navBg,
          borderColor: theme.navBorder,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? palette.coral : theme.navIdle;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
          >
            <MaterialIcons name={meta.icon} size={26} color={color} />
            <Text style={[styles.label, { color }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const theme = useThemeColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="finder" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 66,
    borderRadius: radius.nav,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    ...shadows.nav,
  },
  item: {
    width: 64,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontFamily: font.bodyExtraBold,
    fontSize: 9,
    letterSpacing: 0.2,
  },
});
