import type { DebtDto } from '@lukitas/contracts';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DebtLoadState, DebtPage } from '../components/debt-fields';
import { useDebtData } from '../hooks/use-debt-data';
import { debtDateLabel, debtStatusLabel } from '../presentation/debt-display';
import { styles } from '../styles/debt-styles';

export function DebtDetailScreen({ id }: { id: string }) {
  const {
    data: debt,
    loading,
    error,
    reload,
  } = useDebtData<DebtDto>(`/debts/${encodeURIComponent(id)}`);
  return (
    <DebtPage>
      <DebtLoadState loading={loading} error={error} reload={reload} />
      {debt ? (
        <>
          <View style={styles.header}>
            <Text style={styles.body}>
              {debt.direction === 'PAYABLE' ? 'Por pagar' : 'Por cobrar'}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              {debt.counterparty}
            </Text>
            <Text style={styles.body}>{debt.concept}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Saldo pendiente</Text>
            <Text selectable style={styles.amount}>
              {debt.outstanding} {debt.currencyCode}
            </Text>
            <Text style={[styles.status, debt.status === 'OVERDUE' && styles.overdue]}>
              {debtStatusLabel[debt.status]}
            </Text>
            <Text style={styles.body}>
              Capital registrado: {debt.principal} {debt.currencyCode}
            </Text>
            <Text style={styles.hint}>
              {debt.dueDate ? `Vence ${debtDateLabel(debt.dueDate)}` : 'Sin vencimiento'}
            </Text>
          </View>
          {debt.status !== 'SETTLED' ? (
            <Link href={{ pathname: '/deudas/[id]/abonar', params: { id } }} asChild>
              <Pressable accessibilityRole="link" style={styles.button}>
                <Text style={styles.buttonText}>
                  {debt.direction === 'PAYABLE' ? 'Registrar pago' : 'Registrar cobro'}
                </Text>
              </Pressable>
            </Link>
          ) : null}
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.subtitle}>
              Historial
            </Text>
            <View style={styles.list}>
              {debt.events.map((event) => (
                <View key={event.id} style={styles.listRow}>
                  <View style={styles.row}>
                    <Text style={styles.label}>
                      {event.kind === 'ORIGINATION'
                        ? 'Registro inicial'
                        : debt.direction === 'PAYABLE'
                          ? 'Pago registrado'
                          : 'Cobro registrado'}
                    </Text>
                    <Text style={styles.hint}>{debtDateLabel(event.occurredAt)}</Text>
                  </View>
                  <Text selectable style={styles.value}>
                    {event.debtAmount} {debt.currencyCode}
                    {event.kind === 'PAYMENT' ? ' de capital abonado' : ''}
                  </Text>
                  {event.accountId ? (
                    <>
                      <Text style={styles.body}>
                        {event.cashAmount} {event.cashCurrencyCode} · {event.accountName}
                      </Text>
                      {event.cashCurrencyCode !== debt.currencyCode ? (
                        <Text selectable style={styles.hint}>
                          1 {event.cashCurrencyCode} = {event.rate} {debt.currencyCode}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.hint}>Deuda anterior · Sin movimiento de dinero</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          <Text style={styles.hint}>
            El capital y sus devoluciones no se cuentan como ingresos o gastos. Los registros no se
            pueden editar ni anular en esta versión.
          </Text>
        </>
      ) : null}
    </DebtPage>
  );
}
