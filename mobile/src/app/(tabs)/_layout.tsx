import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '@/design/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textSoft,
        tabBarStyle: {
          backgroundColor: 'rgba(252, 249, 248, 0.96)',
          borderTopColor: palette.border,
          height: 88,
          paddingTop: 10,
          paddingBottom: 18,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analyses"
        options={{
          title: 'Analyses',
          tabBarIcon: ({ color, size }) => (
            <Feather name="film" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
