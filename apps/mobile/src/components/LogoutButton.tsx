import { Pressable, StyleSheet, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export function LogoutButton() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {});
    }
    clearTokens();
    queryClient.clear();
  };

  return (
    <Pressable onPress={handleLogout} hitSlop={8} style={styles.button}>
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: '#208aef',
    fontWeight: '600',
    fontSize: 15,
  },
});
