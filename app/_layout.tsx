import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter, useSegments } from 'expo-router';

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading, loadAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Laad auth uit SecureStore bij opstarten
  useEffect(() => {
    loadAuth();
  }, []);

  // Bewak auth-state wijzigingen na de initiële load (bijv. sessie-expiry, uitloggen)
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && inTabsGroup) {
      // Sessie verlopen of uitgelogd: stuur naar login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Al ingelogd maar op auth-scherm: stuur naar tabs
      router.replace('/(tabs)/rooster');
    }
  }, [user, isLoading, segments]);

  // Render niets zolang auth nog geladen wordt — index.tsx toont de loader
  if (isLoading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        gestureEnabled: false,
        animationEnabled: false,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
