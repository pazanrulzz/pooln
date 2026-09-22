import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';
import { FloatingTabBar } from '../../../components/FloatingTabBar';

function TabIcon({ name }: { name: Parameters<typeof SymbolView>[0]['name'] }) {
  return <SymbolView name={name} size={24} tintColor="#1c1c1e" />;
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Expenses',
          tabBarIcon: () => (
            <TabIcon name={{ ios: 'arrow.left.arrow.right.circle', android: 'swap_horizontal_circle', web: 'swap_horizontal_circle' }} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: () => <TabIcon name={{ ios: 'person.2', android: 'group', web: 'group' }} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: () => <TabIcon name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: () => (
            <TabIcon name={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }} />
          ),
        }}
      />
    </Tabs>
  );
}
