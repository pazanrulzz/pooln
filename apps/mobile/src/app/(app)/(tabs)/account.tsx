import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Host, Text as UIText } from '@expo/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../../../api/auth';
import { useAuthStore } from '../../../stores/authStore';
import { GlassToolbar } from '../../../components/GlassToolbar';

export default function Account() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.fetchMe,
  });

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    clearTokens();
    queryClient.clear();
  };

  return (
    <View style={styles.host}>
      <GlassToolbar title="Account" />

      <Host style={styles.container} colorScheme="light" ignoreSafeArea="all">
        <UIText textStyle={styles.titleText}>Pooln</UIText>

        {isLoading && <ActivityIndicator />}
        {isError && <Text style={styles.error}>Couldn&apos;t load your profile.</Text>}
        {user && (
          <View style={styles.profile}>
            <UIText textStyle={styles.nameText}>{user.displayName}</UIText>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        )}

        <Button variant="text" onPress={handleLogout} style={styles.button}>
          <UIText textStyle={styles.buttonText}>Log out</UIText>
        </Button>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  profile: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  email: {
    color: '#666',
  },
  error: {
    color: '#d92d20',
  },
  button: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: '600',
    color: '#000',
  },
});
