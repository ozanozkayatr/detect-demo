import { Feather } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radii } from '@/design/theme';

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textSoft,
        tabBarStyle: {
          backgroundColor: 'rgba(252, 249, 248, 0.96)',
          borderTopColor: palette.border,
          height: 94,
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
        name="create"
        options={{
          title: '',
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: () => (
            <View style={styles.createButtonWrapper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start a new analysis"
                onPress={() => router.push('/analysis/new')}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                ]}>
                <Feather name="plus" size={24} color="#ffffff" />
              </Pressable>
            </View>
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

const styles = StyleSheet.create({
  createButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  createButton: {
    width: 62,
    height: 62,
    marginTop: -18,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  createButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
