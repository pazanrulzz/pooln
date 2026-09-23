import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Icon, colors, gradients, radius, spacing } from '../ui';

export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <View style={[styles.logo, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Icon name="arrows" size={size * 0.46} color={colors.brand} />
    </View>
  );
}

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.xxxl }]}
        >
          <View style={[styles.orb, styles.orbA]} />
          <View style={[styles.orb, styles.orbB]} />
          <LogoMark />
          <AppText variant="title1" tone="onBrand">
            Pooln
          </AppText>
          <AppText variant="subhead" style={styles.tagline}>
            Split bills, trips and rent — without the awkward maths.
          </AppText>
        </LinearGradient>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.sheetInner}>
            <View style={styles.heading}>
              <AppText variant="title2">{title}</AppText>
              <AppText variant="subhead" tone="secondary">
                {subtitle}
              </AppText>
            </View>
            {children}
            {footer && <View style={styles.footer}>{footer}</View>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl + spacing.xl,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  orbA: { width: 220, height: 220, top: -60, right: -70 },
  orbB: { width: 140, height: 140, bottom: -30, left: -40 },
  logo: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 10px 24px rgba(0,0,0,0.18)',
    marginBottom: spacing.sm,
  },
  tagline: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 280 },
  sheet: {
    flex: 1,
    marginTop: -spacing.xxl,
    borderTopLeftRadius: radius.xl + 6,
    borderTopRightRadius: radius.xl + 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  sheetInner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.lg },
  heading: { gap: 4, marginBottom: spacing.xs },
  footer: { alignItems: 'center', marginTop: spacing.sm },
});
