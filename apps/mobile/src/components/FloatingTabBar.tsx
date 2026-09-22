import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** iOS-26-style floating segmented control used as the app's bottom tab bar: a translucent
 * pill track with an animated white highlight sliding behind the focused icon, in place of
 * React Navigation's default bar. Icons come from each Tabs.Screen's `tabBarIcon` option. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const segmentCount = state.routes.length;
  const [animatedIndex] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      useNativeDriver: false,
      friction: 9,
      tension: 80,
    }).start();
  }, [state.index, animatedIndex]);

  const highlightLeft = animatedIndex.interpolate({
    inputRange: state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => `${(i * 100) / segmentCount}%`),
  });

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 8 }]} pointerEvents="box-none">
      <View style={styles.track}>
        <Animated.View
          style={[styles.highlight, { width: `${100 / segmentCount}%`, left: highlightLeft }]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.segment}>
              {options.tabBarIcon?.({ focused: isFocused, color: '#1c1c1e', size: 24 })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const PILL_HEIGHT = 56;
const PILL_BOTTOM_MARGIN = 8;

/** Bottom offset a floating action button on a tab screen needs to clear the pill nav bar,
 * accounting for the device's safe-area inset the same way the bar itself does. */
export function useTabBarClearance(gapAbovePill = 16) {
  const insets = useSafeAreaInsets();
  return insets.bottom + PILL_BOTTOM_MARGIN + PILL_HEIGHT + gapAbovePill;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  track: {
    flexDirection: 'row',
    width: '100%',
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(118,118,128,0.16)',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  highlight: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: (PILL_HEIGHT - 8) / 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
