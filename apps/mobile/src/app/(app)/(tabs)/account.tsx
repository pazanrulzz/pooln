import { ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import { useAuthStore } from '../../../stores/authStore';
import { COMMON_CURRENCIES } from '../../../lib/money';
import { useTabBarClearance } from '../../../components/FloatingTabBar';
import {
  AppText,
  Avatar,
  Button,
  Card,
  ErrorState,
  LargeHeader,
  ListRow,
  ListSection,
  RowIcon,
  SkeletonList,
  colors,
  confirmDialog,
  showActionSheet,
  showToast,
  spacing,
} from '../../../ui';

export default function Account() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const queryClient = useQueryClient();
  const bottomPadding = useTabBarClearance();

  const { data: user, isLoading, isError, refetch } = useQuery({ queryKey: ['me'], queryFn: authApi.fetchMe });

  const currencyMutation = useMutation({
    mutationFn: (defaultCurrency: string) => authApi.updateMe({ defaultCurrency }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      showToast(`Default currency set to ${updated.defaultCurrency}`);
    },
    onError: () => showToast("Couldn't update your currency", 'error'),
  });

  const pickCurrency = async () => {
    const index = await showActionSheet({
      title: 'New expenses will default to this currency',
      options: COMMON_CURRENCIES.map((c) => ({ label: c })),
    });
    if (index !== null) currencyMutation.mutate(COMMON_CURRENCIES[index]!);
  };

  const signOut = async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      message: 'You can sign back in any time with your email and password.',
      confirmLabel: 'Sign out',
      destructive: true,
    });
    if (!ok) return;
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    clearTokens();
    queryClient.clear();
  };

  return (
    <View style={styles.screen}>
      <LargeHeader title="Account" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        {isLoading && <SkeletonList rows={1} />}
        {isError && <ErrorState message="Couldn't load your profile." onRetry={refetch} />}

        {user && (
          <>
            <Card>
              <View style={styles.profile}>
                <Avatar name={user.displayName} uri={user.avatarUrl} size={64} />
                <View style={styles.profileText}>
                  <AppText variant="title3" numberOfLines={1}>
                    {user.displayName}
                  </AppText>
                  <AppText variant="subhead" tone="secondary" numberOfLines={1}>
                    {user.email}
                  </AppText>
                </View>
              </View>
              <Button
                title="Edit profile"
                icon="pencil"
                variant="tinted"
                size="md"
                block
                style={styles.editButton}
                onPress={() => router.push('/profile/edit')}
              />
            </Card>

            <ListSection title="Preferences" separatorInset={58}>
              <ListRow
                title="Default currency"
                leading={<RowIcon name="globe" color="#34A0F0" />}
                value={user.defaultCurrency}
                onPress={pickCurrency}
              />
              <ListRow
                title="Display name"
                leading={<RowIcon name="person" color={colors.brand} />}
                value={user.displayName}
                onPress={() => router.push('/profile/edit')}
              />
            </ListSection>

            <ListSection title="About" separatorInset={58} footer="Pooln splits shared costs fairly — every cent accounted for.">
              <ListRow
                title="Version"
                leading={<RowIcon name="info" color="#8E8E93" />}
                value={Constants.expoConfig?.version ?? '1.0.0'}
              />
              <ListRow title="Privacy" leading={<RowIcon name="shield" color={colors.positive} />} subtitle="Your data is only visible to people you split with." />
            </ListSection>

            <ListSection>
              <ListRow title="Sign out" destructive chevron={false} leading={<RowIcon name="logout" color={colors.negative} />} onPress={signOut} />
            </ListSection>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xl },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  profileText: { flex: 1, gap: 2 },
  editButton: { marginTop: spacing.lg },
});
