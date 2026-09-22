import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as invitesApi from '../../api/invites';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export default function JoinGroup() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
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

  if (isLoading) return <ActivityIndicator style={styles.spinner} />;

  if (isError || !preview) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>This invite link is no longer valid.</Text>
      </View>
    );
  }

  return (
    <Host style={styles.container} colorScheme="light" ignoreSafeArea="all">
      <UIText textStyle={styles.titleText}>You&apos;re invited</UIText>
      <Text style={styles.body}>
        {preview.invitedByDisplayName} invited you to join &quot;{preview.groupName}&quot; on Pooln.
      </Text>

      {accessToken ? (
        <>
          {acceptMutation.isError && (
            <Text style={styles.error}>
              {acceptMutation.error instanceof ApiError ? acceptMutation.error.message : 'Something went wrong.'}
            </Text>
          )}
          <View style={styles.buttonBox}>
            <Button
              variant="text"
              onPress={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              style={styles.primaryButton}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <UIText textStyle={styles.primaryButtonText}>Join group</UIText>
              )}
            </Button>
          </View>
        </>
      ) : (
        <>
          <View style={styles.buttonBox}>
            <Button
              variant="text"
              onPress={() => router.push({ pathname: '/sign-up', params: { inviteToken: token } })}
              style={styles.primaryButton}
            >
              <UIText textStyle={styles.primaryButtonText}>Sign up to join</UIText>
            </Button>
          </View>
          <Button
            variant="text"
            onPress={() => router.push({ pathname: '/sign-in', params: { inviteToken: token } })}
            style={styles.secondaryButton}
          >
            <UIText textStyle={styles.secondaryButtonText}>Already have an account? Sign in</UIText>
          </Button>
        </>
      )}
    </Host>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  spinner: { marginTop: 40 },
  titleText: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#000' },
  body: { fontSize: 16, textAlign: 'center', color: '#444' },
  error: { color: '#d92d20', fontSize: 13, textAlign: 'center' },
  buttonBox: { marginTop: 8 },
  primaryButton: {
    backgroundColor: '#208aef',
    borderRadius: 8,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: { paddingVertical: 8 },
  secondaryButtonText: { color: '#208aef' },
});
