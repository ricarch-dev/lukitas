import React, { useEffect, useState } from 'react';
import type { AuthResponseDto } from '@lukitas/contracts';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../session/SessionContext';
import { clearSessionForLogin } from './session-recovery';
import { AuthScreen, OnboardingScreen } from '../features/screens';

export function RootNavigator({ children }: { readonly children?: React.ReactNode }) {
  const { ready, tokens, client, setTokens } = useSession();
  const [onboarding, setOnboarding] = useState<{
    token: string;
    status: 'complete' | 'pending' | 'error';
  } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    if (tokens)
      client
        .get<Pick<AuthResponseDto, 'user'>>('/auth/me')
        .then((value) => {
          if (current)
            setOnboarding({
              token: tokens.accessToken,
              status: value.user.onboardingComplete ? 'complete' : 'pending',
            });
        })
        .catch(() => {
          if (current) setOnboarding({ token: tokens.accessToken, status: 'error' });
        });
    else setOnboarding(null);
    return () => {
      current = false;
    };
  }, [tokens, client, retry]);
  if (!ready || (tokens && onboarding?.token !== tokens.accessToken))
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (!tokens) return <AuthScreen />;
  if (onboarding?.status === 'error')
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text accessibilityRole="alert">
          No pudimos comprobar tu cuenta. Revisa tu conexión o vuelve a iniciar sesión.
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}>
          <Text>Reintentar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Elimina solo las credenciales guardadas en este dispositivo; tus datos permanecen en tu cuenta."
          onPress={() => void clearSessionForLogin(setTokens)}
        >
          <Text>Volver a iniciar sesión</Text>
        </Pressable>
      </View>
    );
  return onboarding?.status === 'complete' ? (
    (children ?? <Redirect href="/(tabs)" />)
  ) : (
    <OnboardingScreen
      onComplete={() => setOnboarding({ token: tokens.accessToken, status: 'complete' })}
    />
  );
}
