import { useState } from 'react';
import type { DebtsOverviewDto } from '@lukitas/contracts';
import { SUPPORTED_MONETARY_UNITS } from '@lukitas/domain';
import { Text, View } from 'react-native';
import { buildDebtRequest, type DebtForm } from '../actions/debt-submit';
import {
  CashFields,
  DebtButton,
  DebtChoice,
  DebtField,
  DebtLoadState,
  DebtPage,
} from '../components/debt-fields';
import { useDebtData } from '../hooks/use-debt-data';
import { useDebtSubmit } from '../hooks/use-debt-submit';
import { localToday } from '../presentation/debt-display';
import { styles } from '../styles/debt-styles';

export function CreateDebtScreen() {
  const state = useDebtData<DebtsOverviewDto>('/debts', true);
  const submit = useDebtSubmit();
  const [form, setForm] = useState<DebtForm>(() => ({
    direction: 'PAYABLE',
    counterparty: '',
    concept: '',
    principal: '',
    currencyCode: 'USD',
    date: localToday(),
    dueDate: '',
    movesCash: false,
    accountId: '',
    cashAmount: '',
    rate: '',
  }));
  function change<K extends keyof DebtForm>(key: K, value: DebtForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  return (
    <DebtPage>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Registrar deuda o préstamo
        </Text>
        <Text style={styles.body}>
          Elige cómo se originó para no contar el mismo dinero dos veces.
        </Text>
      </View>
      <DebtLoadState loading={state.loading} error={state.error} reload={state.reload} />
      {state.data ? (
        <>
          <View style={styles.choices}>
            <DebtChoice
              label="Por pagar · debo dinero"
              selected={form.direction === 'PAYABLE'}
              disabled={submit.disabled}
              onPress={() => change('direction', 'PAYABLE')}
            />
            <DebtChoice
              label="Por cobrar · me deben"
              selected={form.direction === 'RECEIVABLE'}
              disabled={submit.disabled}
              onPress={() => change('direction', 'RECEIVABLE')}
            />
          </View>
          <DebtField
            label="Persona o entidad"
            value={form.counterparty}
            onChange={(value) => change('counterparty', value)}
            disabled={submit.disabled}
          />
          <DebtField
            label="Concepto"
            value={form.concept}
            onChange={(value) => change('concept', value)}
            disabled={submit.disabled}
          />
          <View style={styles.group}>
            <Text style={styles.label}>Moneda de la deuda</Text>
            <View style={styles.choices}>
              {Object.values(SUPPORTED_MONETARY_UNITS)
                .filter((unit) => unit.active)
                .map((unit) => (
                  <DebtChoice
                    key={unit.code}
                    label={unit.code}
                    selected={unit.code === form.currencyCode}
                    disabled={submit.disabled}
                    onPress={() => change('currencyCode', unit.code)}
                  />
                ))}
            </View>
          </View>
          <DebtField
            label="Capital pendiente"
            value={form.principal}
            onChange={(value) => change('principal', value)}
            numeric
            disabled={submit.disabled}
            hint="Para una deuda anterior, ingresa solo lo que todavía queda por pagar o cobrar."
          />
          <DebtField
            label="Fecha del registro"
            value={form.date}
            onChange={(value) => change('date', value)}
            disabled={submit.disabled}
            hint="AAAA-MM-DD"
          />
          <DebtField
            label="Vencimiento (opcional)"
            value={form.dueDate}
            onChange={(value) => change('dueDate', value)}
            disabled={submit.disabled}
            hint="AAAA-MM-DD. Déjalo vacío si no tiene vencimiento."
          />
          <View style={styles.group}>
            <Text style={styles.label}>¿El dinero se mueve ahora?</Text>
            <View style={styles.choices}>
              <DebtChoice
                label="Es una deuda anterior"
                selected={!form.movesCash}
                disabled={submit.disabled}
                onPress={() => change('movesCash', false)}
              />
              <DebtChoice
                label="El dinero se mueve ahora"
                selected={form.movesCash}
                disabled={submit.disabled}
                onPress={() => change('movesCash', true)}
              />
            </View>
            <Text style={styles.body}>
              {!form.movesCash
                ? 'No se cambiará el saldo de ninguna cuenta.'
                : form.direction === 'PAYABLE'
                  ? 'El dinero recibido se sumará a tu cuenta, sin registrarlo como ingreso.'
                  : 'El dinero prestado se descontará de tu cuenta, sin registrarlo como gasto.'}
            </Text>
          </View>
          {form.movesCash ? (
            <CashFields
              accounts={state.accounts}
              accountId={form.accountId}
              amount={form.cashAmount}
              rate={form.rate}
              currencyCode={form.currencyCode}
              disabled={submit.disabled}
              onAccount={(value) => change('accountId', value)}
              onAmount={(value) => change('cashAmount', value)}
              onRate={(value) => change('rate', value)}
            />
          ) : null}
          {submit.error ? (
            <Text accessibilityRole="alert" selectable style={styles.error}>
              {submit.error}
            </Text>
          ) : null}
          {submit.retryPending ? (
            <Text style={styles.body}>
              Los datos se mantienen bloqueados hasta confirmar este intento. Reintentar no crea un
              duplicado.
            </Text>
          ) : null}
          <DebtButton
            label={
              submit.busy
                ? 'Guardando…'
                : submit.retryPending
                  ? 'Reintentar registro'
                  : 'Guardar registro'
            }
            disabled={submit.busy}
            onPress={() => void submit.save(() => buildDebtRequest(form, state.accounts))}
          />
        </>
      ) : null}
    </DebtPage>
  );
}
