import { SessionProvider } from '../session/SessionContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#F1F5F4' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="informes" options={{ title: 'Informes' }} />
        <Stack.Screen name="crear-cuenta" options={{ title: 'Crear cuenta', presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </SessionProvider>
  );
}
