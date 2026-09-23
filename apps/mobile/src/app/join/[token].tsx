import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as invitesApi from '../../api/invites';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayout } from '../../components/AuthLayout';
import { AppText, Avatar, Banner, Button, EmptyState, Skeleton, colors, radius, spacing } from '../../ui';

export default function JoinGroup() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invites', token],
    queryFn: () => invitesApi.getInvitePreview(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitesApi.acceptInvite(token),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.replace(`/groups/${group.id}`);
    },
  });

  if (isError) {
    return (
      <View style={styles.invalid}>
        <EmptyState
          icon="link"
          title="Invite link expired"
          message="This invite is no longer valid. Ask a group member to share a new link."
          actionLabel="Go to Pooln"
          onAction={() => router.replace('/')}
        />
      </View>
    );
  }

  return (
    <AuthLayout title="You're invited" subtitle="Join the group to start splitting expenses together.">
      <View style={styles.invite}>
        {isLoading || !preview ? (
          <>
            <Skeleton width={56} height={56} round />
            <Skeleton width="60%" height={16} />
          </>
        ) : (
          <>
            <Avatar name={preview.groupName} size={56} shape="squircle" icon="userGroup" />
            <View style={styles.inviteText}>
              <AppText variant="headline" numberOfLines={1}>
                {preview.groupName}
              </AppText>
              <AppText variant="footnote" tone="secondary">
                Invited by {preview.invitedByDisplayName}
              </AppText>
            </View>
          </>
        )}
      </View>

      {acceptMutation.isError && (
        <Banner tone="error">
          {acceptMutation.error instanceof ApiError ? acceptMutation.error.message : 'Something went wrong.'}
        </Banner>
      )}

      {accessToken ? (
        <Button title="Join group" icon="personAdd" onPress={() => acceptMutation.mutate()} loading={acceptMutation.isPending} />
      ) : (
        <>
          <Button title="Create account to join" onPress={() => router.push({ pathname: '/sign-up', params: { inviteToken: token } })} />
          <Button
            title="I already have an account"
            variant="plain"
            onPress={() => router.push({ pathname: '/sign-in', params: { inviteToken: token } })}
          />
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  invalid: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  inviteText: { flex: 1, gap: 2 },
});
