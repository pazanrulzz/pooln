import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { colors, radius } from './theme';

type Tone = 'neutral' | 'brand' | 'positive' | 'negative';

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.fill, fg: colors.secondaryLabel },
  brand: { bg: colors.brandTint, fg: colors.brand },
  positive: { bg: colors.positiveTint, fg: colors.positive },
  negative: { bg: colors.negativeTint, fg: colors.negative },
};

interface Props {
  label: string;
  icon?: IconName;
  tone?: Tone;
  /** Makes it a toggleable filter chip. */
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, icon, tone = 'neutral', selected, onPress, onRemove, style }: Props) {
  const isFilter = selected !== undefined;
  const t = isFilter
    ? selected
      ? { bg: colors.label, fg: colors.surface }
      : { bg: colors.surface, fg: colors.label }
    : tones[tone];

  const body = (
    <View
      style={[
        styles.chip,
        isFilter && styles.filter,
        { backgroundColor: t.bg },
        isFilter && !selected && styles.filterIdle,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={isFilter ? 13 : 11} color={t.fg} />}
      <AppText variant={isFilter ? 'subhead' : 'caption'} weight="600" style={{ color: t.fg }} numberOfLines={1}>
        {label}
      </AppText>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
          <Icon name="xmark" size={10} color={t.fg} />
        </Pressable>
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  filter: { paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  filterIdle: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
  pressed: { opacity: 0.7 },
});
