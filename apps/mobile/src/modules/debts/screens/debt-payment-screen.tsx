import { useState } from 'react';
import type { DebtDto } from '@lukitas/contracts';
import { Text, View } from 'react-native';
import { buildDebtPayment, type PaymentForm } from '../actions/debt-submit';
import {
  CashFields,
  DebtButton,
  DebtField,
  DebtLoadState,
  DebtPage,
} from '../components/debt-fields';
import { useDebtData } from '../hooks/use-debt-data';
import { useDebtSubmit } from '../hooks/use-debt-submit';
import { localToday } from '../presentation/debt-display';
import { styles } from '../styles/debt-styles';

export function DebtPaymentScreen({ id }: { id: string }) {
  const {
    data: debt,
    accounts,
    loading,
    error,
    reload,
  } = useDebtData<DebtDto>(`/debts/${encodeURIComponent(id)}`, true);
  const submit = useDebtSubmit(id);
  const [form, setForm] = useState<PaymentForm>(() => ({
    accountId: '',
    amount: '',
    rate: '',
    date: localToday(),
  }));
  function change<K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  let reduction = '';
  if (debt) {
    try {
      reduction = buildDebtPayment(form, debt, accounts).reduction;
    } catch {
      /* Incomplete form is validated when submitted. */
    }
  }
  return (
    <DebtPage>
      <DebtLoadState loading={loading} error={error} reload={reload} />
      {debt ? (
        <>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {debt.direction === 'PAYABLE' ? 'Registrar pago' : 'Registrar cobro'}
            </Text>
            <Text style={styles.subtitle}>{debt.counterparty}</Text>
            <Text selectable style={styles.body}>
              Pendiente: {debt.outstanding} {debt.currencyCode}
            </Text>
            <Text style={styles.body}>
              {debt.direction === 'PAYABLE'
                ? 'El abono se descontará de la cuenta elegida.'
                : 'El cobro se sumará a la cuenta elegida.'}{' '}
              No se contará como ingreso o gasto.
            </Text>
          </View>
          {debt.status === 'SETTLED' ? (
            <Text style={styles.body}>Este registro ya está saldado.</Text>
          ) : (
            <>
              <CashFields
                accounts={accounts}
                accountId={form.accountId}
                amount={form.amount}
                rate={form.rate}
                currencyCode={debt.currencyCode}
                disabled={submit.disabled}
                onAccount={(value) => change('accountId', value)}
                onAmount={(value) => change('amount', value)}
                onRate={(value) => change('rate', value)}
              />
              <DebtField
                label="Fecha del abono"
                value={form.date}
                onChange={(value) => change('date', value)}
                disabled={submit.disabled}
                hint="AAAA-MM-DD"
              />
              {reduction ? (
                <View style={styles.note}>
                  <Text selectable style={styles.value}>
                    Se abonarán {reduction} {debt.currencyCode} de capital.
                  </Text>
                  <Text style={styles.body}>La tasa y ambos montos quedarán guardados.</Text>
                </View>
              ) : null}
              {submit.error ? (
                <Text accessibilityRole="alert" selectable style={styles.error}>
                  {submit.error}
                </Text>
              ) : null}
              {submit.retryPending ? (
                <Text style={styles.body}>
                  Reintenta con los mismos datos para confirmar el abono sin duplicarlo.
                </Text>
              ) : null}
              <DebtButton
                label={
                  submit.busy
                    ? 'Guardando…'
                    : submit.retryPending
                      ? 'Reintentar abono'
                      : 'Confirmar abono'
                }
                onPress={() =>
                  void submit.save(() => buildDebtPayment(form, debt, accounts).request)
                }
                disabled={submit.busy || !accounts.length}
              />
            </>
          )}
        </>
      ) : null}
    </DebtPage>
  );
}
