import type { DashboardAccountCurrencyFilter, DashboardDto } from '@lukitas/contracts';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../../session/SessionContext';

export function useDashboard(accountCurrency?: DashboardAccountCurrencyFilter) {
  const { client } = useSession();
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setError('');
      setIsLoading(true);
      client
        .get<DashboardDto>(
          `/dashboard${accountCurrency ? `?accountCurrency=${accountCurrency}` : ''}`,
        )
        .then((value) => {
          if (current) {
            setDashboard(value);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (current) {
            setError('No pudimos cargar tus datos. Revisa tu conexión e intenta de nuevo.');
            setIsLoading(false);
          }
        });
      return () => {
        current = false;
      };
    }, [accountCurrency, client]),
  );
  return { dashboard, error, isLoading };
}
