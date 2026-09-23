import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { colors, radius, shadow, spacing } from './theme';

interface SectionProps {
  title?: string;
  /** Right-aligned header action, e.g. "See all". */
  action?: ReactNode;
  footer?: string;
  /** Left inset of the hairline separators between rows (aligns with row text). */
  separatorInset?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** iOS inset-grouped table section: optional header, rows in a rounded card, optional footer. */
export function ListSection({ title, action, footer, separatorInset = spacing.lg, children, style }: SectionProps) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.section, style]}>
      {(title || action) && (
        <View style={styles.header}>
          {title ? (
            <AppText variant="footnote" tone="secondary" weight="600" style={styles.headerText}>
              {title.toUpperCase()}
            </AppText>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      {rows.length > 0 && (
        <View style={styles.card}>
          {rows.map((row, i) => (
            <Fragment key={i}>
              {i > 0 && <View style={[styles.separator, { marginLeft: separatorInset }]} />}
              {row}
            </Fragment>
          ))}
        </View>
      )}
      {footer && (
        <AppText variant="footnote" tone="secondary" style={styles.footer}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  /** Secondary text on the right (e.g. a current setting value). */
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leading,
  value,
  trailing,
  onPress,
  chevron = !!onPress,
  destructive,
  disabled,
}: RowProps) {
  const content = (
    <View style={styles.row}>
      {leading}
      <View style={styles.text}>
        <AppText variant="body" tone={destructive ? 'negative' : 'label'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        )}
      </View>
      {value && (
        <AppText variant="body" tone="secondary" numberOfLines={1}>
          {value}
        </AppText>
      )}
      {trailing}
      {chevron && <Icon name="chevronRight" size={13} color={colors.tertiaryLabel} />}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}
    >
      {content}
    </Pressable>
  );
}

/** Colored rounded-square icon used as a ListRow `leading`, like iOS Settings. */
export function RowIcon({ name, color }: { name: Parameters<typeof Icon>[0]['name']; color: string }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: color }]}>
      <Icon name={name} size={15} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerText: { letterSpacing: 0.2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    boxShadow: shadow.card,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  footer: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  text: { flex: 1, gap: 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.5 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
