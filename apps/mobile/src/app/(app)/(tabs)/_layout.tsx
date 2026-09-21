import { Tabs } from 'expo-router';
import { LogoutButton } from '../../../components/LogoutButton';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerRight: () => <LogoutButton /> }}>
      <Tabs.Screen name="index" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="balances" options={{ title: 'Balances' }} />
      <Tabs.Screen name="account" options={{ title: 'Account', headerRight: () => null }} />
    </Tabs>
  );
}
