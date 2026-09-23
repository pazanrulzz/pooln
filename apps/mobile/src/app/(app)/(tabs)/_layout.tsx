import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { FloatingTabBar } from '../../../components/FloatingTabBar';
import { Icon, type IconName } from '../../../ui';

function tabIcon(name: IconName) {
  function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={22} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Expenses', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: tabIcon('userGroup') }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: tabIcon('activity') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('personCircle') }} />
    </Tabs>
  );
}
