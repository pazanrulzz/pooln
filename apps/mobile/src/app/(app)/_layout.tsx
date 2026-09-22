import { Stack } from 'expo-router';
import { BackButton } from '../../components/BackButton';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerLeft: () => <BackButton /> }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
