import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import type { CreateDebtRequest, RecordDebtPaymentRequest } from '@lukitas/contracts';
import { ApiError } from '../../../api/client';
import { useSession } from '../../../session/SessionContext';
import { DebtInputError, submitDebt } from '../actions/debt-submit';

export function useDebtSubmit(id?: string) {
  const { client } = useSession();
  const router = useRouter();
  const lock = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const [busy, setBusy] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [error, setError] = useState('');
  async function save(build: () => CreateDebtRequest | RecordDebtPaymentRequest) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const request = build();
      const fingerprint = JSON.stringify([id, request]);
      let key = attempts.current.get(fingerprint);
      if (!key) {
        key = `debt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        attempts.current.set(fingerprint, key);
      }
      const result = await submitDebt(client, request, key, id);
      setRetryPending(false);
      if (id) router.back();
      else router.replace({ pathname: '/deudas/[id]', params: { id: result.id } });
    } catch (value: unknown) {
      const uncertain =
        !(value instanceof DebtInputError) && !(value instanceof ApiError && value.status < 500);
      setRetryPending(uncertain);
      setError(
        value instanceof DebtInputError
          ? value.message
          : value instanceof ApiError && value.code === 'CONFLICT'
            ? 'El saldo cambió. Vuelve al detalle y revisa los abonos antes de intentar de nuevo.'
            : value instanceof ApiError && value.code === 'VALIDATION_ERROR'
              ? 'Revisa los montos, las fechas y la tasa. El abono no puede superar el saldo pendiente.'
              : 'No pudimos confirmar el registro. Reintenta con los mismos datos para evitar duplicados.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { save, busy, retryPending, error, disabled: busy || retryPending };
}
