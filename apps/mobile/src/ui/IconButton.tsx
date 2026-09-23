import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Icon, type IconName } from './Icon';
import { colors, radius } from './theme';

type Variant = 'glass' | 'filled' | 'tinted' | 'gray';

const palette: Record<Variant, { bg: string; fg: string }> = {
  glass: { bg: 'rgba(255,255,255,0.82)', fg: colors.label },
  filled: { bg: colors.brand, fg: colors.onBrand },
  tinted: { bg: colors.brandTint, fg: colors.brand },
  gray: { bg: colors.fill, fg: colors.label },
};

interface Props {
  icon: IconName;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, variant = 'glass', size = 38, disabled, accessibilityLabel, style }: Props) {
  const p = palette[variant];
  const circle = { width: size, height: size, borderRadius: radius.pill, backgroundColor: p.bg };
  const glyph = <Icon name={icon} size={Math.round(size * 0.44)} color={p.fg} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      {variant === 'glass' ? (
        // Real Liquid Glass on iOS 26; a translucent pill elsewhere.
        <GlassView glassEffectStyle="regular" colorScheme="light" isInteractive style={[styles.center, styles.glassEdge, circle]}>
          {glyph}
        </GlassView>
      ) : (
        <View style={[styles.center, circle]}>{glyph}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glassEdge: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.06)', boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.4 },
});
