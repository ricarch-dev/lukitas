import { SessionProvider } from '../session/SessionContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { APP_COLORS } from '../features/auth-screen-theme';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: APP_COLORS.canvas },
          headerStyle: { backgroundColor: APP_COLORS.surface },
          headerTintColor: APP_COLORS.primary,
          headerTitleStyle: { color: APP_COLORS.ink, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="informes" options={{ title: 'Informes' }} />
        <Stack.Screen
          name="crear-cuenta"
          options={{ title: 'Crear cuenta', presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </SessionProvider>
  );
}
