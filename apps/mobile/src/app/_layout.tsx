import { SessionProvider } from '../session/SessionContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { APP_COLORS } from '../shared/theme/app-colors';

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
          options={{ title: 'Nueva cuenta', presentation: 'modal' }}
        />
        <Stack.Screen name="cuentas" options={{ title: 'Cuentas' }} />
        <Stack.Screen name="cuenta/[id]" options={{ title: 'Detalle de cuenta' }} />
        <Stack.Screen name="deudas/index" options={{ title: 'Deudas y préstamos' }} />
        <Stack.Screen name="deudas/crear" options={{ title: 'Nuevo registro' }} />
        <Stack.Screen name="deudas/[id]" options={{ title: 'Detalle' }} />
        <Stack.Screen name="deudas/[id]/abonar" options={{ title: 'Registrar abono' }} />
      </Stack>
      <StatusBar style="auto" />
    </SessionProvider>
  );
}
