import { useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { colors, radius, spacing } from './theme';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.brand} />
      </View>
      <AppText variant="title3" align="center">
        {title}
      </AppText>
      {message && (
        <AppText variant="subhead" tone="secondary" align="center" style={styles.emptyMessage}>
          {message}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="md" icon="plus" style={styles.emptyAction} />
      )}
    </View>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.negativeTint }]}>
        <Icon name="warning" size={28} color={colors.negative} />
      </View>
      <AppText variant="headline" align="center">
        {message}
      </AppText>
      {onRetry && <Button title="Try again" variant="tinted" size="md" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

function usePulse() {
  const [opacity] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.55, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

export function Skeleton({ width = '100%', height = 14, round }: { width?: DimensionValue; height?: number; round?: boolean }) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={{ width, height, opacity, borderRadius: round ? height / 2 : 6, backgroundColor: colors.fillStrong }}
    />
  );
}

/** Placeholder rows shown while a list's first page loads. */
export function SkeletonList({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <View style={styles.skeletonCard}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          {avatar && <Skeleton width={42} height={42} round />}
          <View style={styles.skeletonText}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={56} height={14} />
        </View>
      ))}
    </View>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'error'; children: ReactNode }) {
  const isError = tone === 'error';
  return (
    <View style={[styles.banner, { backgroundColor: isError ? colors.negativeTint : colors.brandTint }]}>
      <Icon name={isError ? 'warning' : 'info'} size={15} color={isError ? colors.negative : colors.brand} />
      <AppText variant="footnote" style={[styles.bannerText, { color: isError ? colors.negative : colors.brand }]}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyMessage: { maxWidth: 300 },
  emptyAction: { alignSelf: 'center', marginTop: spacing.md },
  skeletonCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.xs },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  skeletonText: { flex: 1, gap: 8 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.md, borderRadius: radius.md },
  bannerText: { flex: 1 },
});
