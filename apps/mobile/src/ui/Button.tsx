import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors, radius, shadow } from './theme';

type Variant = 'filled' | 'tinted' | 'gray' | 'plain' | 'destructive';
type Size = 'lg' | 'md' | 'sm';

const variantStyles: Record<Variant, { bg: string; fg: string }> = {
  filled: { bg: colors.brand, fg: colors.onBrand },
  tinted: { bg: colors.brandTint, fg: colors.brand },
  gray: { bg: colors.fill, fg: colors.label },
  plain: { bg: 'transparent', fg: colors.brand },
  destructive: { bg: colors.negativeTint, fg: colors.negative },
};

const sizeStyles: Record<Size, { height: number; paddingHorizontal: number; radius: number; font: 'headline' | 'subhead' | 'footnote'; icon: number }> = {
  lg: { height: 52, paddingHorizontal: 20, radius: radius.md + 2, font: 'headline', icon: 18 },
  md: { height: 44, paddingHorizontal: 16, radius: radius.md, font: 'subhead', icon: 16 },
  sm: { height: 32, paddingHorizontal: 12, radius: radius.pill, font: 'footnote', icon: 13 },
};

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to fill the parent's width (default for `lg`). */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'filled',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  block = size === 'lg',
  style,
  accessibilityLabel,
}: Props) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: v.bg,
        },
        block ? styles.block : styles.inline,
        variant === 'filled' && size === 'lg' && !inactive && { boxShadow: shadow.button },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={s.icon} color={v.fg} />}
          <AppText variant={s.font} weight="600" style={{ color: v.fg }} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  block: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
});
