import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { AccountDto } from '@lukitas/contracts';
import { useSession } from '../../../session/SessionContext';

export function useDebtData<T>(path: string, withAccounts = false) {
  const { client } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      setData(null);
      Promise.all([
        client.get<T>(path),
        withAccounts ? client.get<AccountDto[]>('/accounts') : Promise.resolve([]),
      ])
        .then(([next, cashAccounts]) => {
          if (active) {
            setData(next);
            setAccounts(cashAccounts);
          }
        })
        .catch(() => {
          if (active)
            setError(
              'No pudimos cargar tus deudas y préstamos. Revisa tu conexión e intenta de nuevo.',
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [client, path, revision, withAccounts]),
  );
  return { data, accounts, loading, error, reload: () => setRevision((value) => value + 1) };
}
