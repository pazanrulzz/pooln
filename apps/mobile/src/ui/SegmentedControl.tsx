import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, radius } from './theme';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** iOS UISegmentedControl: gray track with a white thumb that springs to the selection. */
export function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [position] = useState(() => new Animated.Value(index));

  useEffect(() => {
    Animated.spring(position, { toValue: index, useNativeDriver: false, friction: 10, tension: 90 }).start();
  }, [index, position]);

  const segmentWidth = trackWidth > 0 ? (trackWidth - 4) / options.length : 0;

  return (
    <View style={[styles.track, style]} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              transform: [{ translateX: Animated.multiply(position, segmentWidth) }],
            },
          ]}
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <AppText variant="footnote" weight={active ? '600' : '500'} tone={active ? 'label' : 'secondary'} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 34,
    padding: 2,
    borderRadius: radius.sm + 1,
    backgroundColor: colors.fill,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: radius.sm - 1,
    backgroundColor: colors.surface,
    boxShadow: '0px 3px 8px rgba(0,0,0,0.12), 0px 1px 1px rgba(0,0,0,0.04)',
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
