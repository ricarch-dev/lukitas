import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../session/SessionContext';
import { AuthScreen, DashboardScreen, OnboardingScreen } from '../features/screens';

export function RootNavigator() {
  const { ready, tokens, client } = useSession(); const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => { if (tokens) client.get<any>('/auth/me').then((value) => setOnboarded(Boolean(value.user.onboardingComplete))).catch(() => setOnboarded(false)); else setOnboarded(null); }, [tokens, client]);
  if (!ready || (tokens && onboarded === null)) return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!tokens) return <AuthScreen />;
  return onboarded ? <DashboardScreen /> : <OnboardingScreen />;
}
