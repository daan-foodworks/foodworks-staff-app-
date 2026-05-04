import { Tabs } from 'expo-router';
import { Colors } from '@/lib/colors';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.coral,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.line, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="rooster"
        options={{
          title: 'Rooster',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="diensten"
        options={{
          title: 'Diensten',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inklokken"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="declaraties"
        options={{
          title: 'Declaraties',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profiel"
        options={{
          title: 'Profiel',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
