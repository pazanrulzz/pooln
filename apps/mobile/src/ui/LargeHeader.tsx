import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colors, spacing } from './theme';

interface Props {
  title: string;
  subtitle?: string;
  /** Trailing header buttons (IconButtons). */
  actions?: ReactNode;
  /** Content pinned under the title, e.g. a SearchBar or filter chips. */
  children?: ReactNode;
}

/** iOS large-title navigation header used on each tab's root screen. */
export function LargeHeader({ title, subtitle, actions, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          {subtitle && (
            <AppText variant="footnote" tone="secondary" weight="600">
              {subtitle}
            </AppText>
          )}
          <AppText variant="largeTitle" numberOfLines={1}>
            {title}
          </AppText>
        </View>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {children && <View style={styles.accessory}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.background },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  titleText: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 4 },
  accessory: { marginTop: spacing.md, gap: spacing.md },
});
