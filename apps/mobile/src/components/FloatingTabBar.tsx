import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, colors } from '../ui';

const PILL_HEIGHT = 66;
const PILL_BOTTOM_MARGIN = 20;

/** iOS-26-style floating tab bar: a frosted capsule with a highlight that springs behind the
 * focused tab, icon + label per tab, brand-tinted when selected. */
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
    <View style={[styles.wrapper, { bottom: insets.bottom + PILL_BOTTOM_MARGIN }]} pointerEvents="box-none">
      <View style={styles.track}>
        <Animated.View style={[styles.highlightSlot, { width: `${100 / segmentCount}%`, left: highlightLeft }]}>
          <View style={styles.highlight} />
        </Animated.View>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? colors.brand : colors.secondaryLabel;
          const label = typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isFocused }}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 22 })}
              <AppText style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom padding a tab screen's scroll content needs to clear the floating tab bar. */
export function useTabBarClearance(gapAbovePill = 16) {
  const insets = useSafeAreaInsets();
  return insets.bottom + PILL_BOTTOM_MARGIN + PILL_HEIGHT + gapAbovePill;
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  track: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 460,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(250,250,252,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 4,
    boxShadow: '0px 10px 30px rgba(16,24,40,0.14), 0px 2px 6px rgba(16,24,40,0.06)',
  },
  highlightSlot: { position: 'absolute', top: 4, bottom: 4, paddingHorizontal: 4 },
  highlight: { flex: 1, borderRadius: (PILL_HEIGHT - 8) / 2, backgroundColor: colors.brandTint },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, lineHeight: 13, fontWeight: '600' },
});
