import type { DashboardDto } from '@lukitas/contracts';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../session/SessionContext';

export function useDashboard() {
  const { client } = useSession();
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let current = true;
    setError('');
    client.get<DashboardDto>('/dashboard').then(value => {
      if (current) setDashboard(value);
    }).catch(() => {
      if (current) setError('No pudimos cargar tus datos. Revisa tu conexión e intenta de nuevo.');
    });
    return () => { current = false; };
  }, [client]));
  return { dashboard, error };
}
