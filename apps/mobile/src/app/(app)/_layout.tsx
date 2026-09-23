import { Stack } from 'expo-router';
import { BackButton } from '../../components/BackButton';
import { colors } from '../../ui';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerLeft: () => <BackButton />,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontSize: 17, fontWeight: '600', color: colors.label },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="groups/new" options={{ title: 'New group' }} />
      <Stack.Screen name="groups/[id]" options={{ title: '' }} />
      <Stack.Screen name="expenses/new/index" options={{ headerShown: false }} />
      <Stack.Screen name="expenses/new/details" options={{ title: 'New expense' }} />
      <Stack.Screen name="expenses/[id]" options={{ title: '' }} />
      <Stack.Screen name="expenses/[id]/edit" options={{ title: 'Edit expense' }} />
      <Stack.Screen name="balances/[userId]" options={{ title: '' }} />
      <Stack.Screen name="settle/[userId]" options={{ title: 'Settle up' }} />
      <Stack.Screen name="profile/edit" options={{ title: 'Edit profile' }} />
    </Stack>
  );
}
