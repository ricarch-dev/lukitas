import { useState } from 'react';
import type { DebtsOverviewDto } from '@lukitas/contracts';
import type { DebtDirection } from '@lukitas/domain';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { DebtChoice, DebtLoadState, DebtPage } from '../components/debt-fields';
import { useDebtData } from '../hooks/use-debt-data';
import { debtDateLabel, debtStatusLabel } from '../presentation/debt-display';
import { styles } from '../styles/debt-styles';

export function DebtsScreen() {
  const [direction, setDirection] = useState<DebtDirection>('PAYABLE');
  const { data, loading, error, reload } = useDebtData<DebtsOverviewDto>('/debts');
  const items = data?.items.filter((item) => item.direction === direction) ?? [];
  return (
    <DebtPage>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Deudas y préstamos
        </Text>
        <Text style={styles.body}>
          Lo que debes y lo que te deben, separado de tu dinero disponible.
        </Text>
      </View>
      <Link href="/deudas/crear" asChild>
        <Pressable accessibilityRole="link" style={styles.button}>
          <Text style={styles.buttonText}>Registrar deuda o préstamo</Text>
        </Pressable>
      </Link>
      <View style={styles.choices}>
        <DebtChoice
          label="Por pagar"
          selected={direction === 'PAYABLE'}
          onPress={() => setDirection('PAYABLE')}
        />
        <DebtChoice
          label="Por cobrar"
          selected={direction === 'RECEIVABLE'}
          onPress={() => setDirection('RECEIVABLE')}
        />
      </View>
      <DebtLoadState loading={loading} error={error} reload={reload} />
      {data ? (
        <>
          <View style={styles.group}>
            {data.totals.map((total) => (
              <View key={total.currencyCode} style={styles.row}>
                <Text style={styles.body}>Pendiente en {total.currencyCode}</Text>
                <Text selectable style={styles.value}>
                  {direction === 'PAYABLE' ? total.payable : total.receivable} {total.currencyCode}
                </Text>
              </View>
            ))}
          </View>
          {items.length ? (
            <View style={styles.list}>
              {items.map((debt) => (
                <Link
                  key={debt.id}
                  href={{ pathname: '/deudas/[id]', params: { id: debt.id } }}
                  asChild
                >
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${debt.counterparty}, ${debt.outstanding} ${debt.currencyCode}, ${debtStatusLabel[debt.status]}`}
                    style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                  >
                    <View style={styles.row}>
                      <Text style={styles.subtitle}>{debt.counterparty}</Text>
                      <Text style={[styles.status, debt.status === 'OVERDUE' && styles.overdue]}>
                        {debtStatusLabel[debt.status]}
                      </Text>
                    </View>
                    <Text style={styles.body}>{debt.concept}</Text>
                    <View style={styles.row}>
                      <Text selectable style={styles.value}>
                        {debt.outstanding} {debt.currencyCode}
                      </Text>
                      <Text style={styles.hint}>
                        {debt.dueDate ? `Vence ${debtDateLabel(debt.dueDate)}` : 'Sin vencimiento'}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          ) : (
            <View style={styles.note}>
              <Text style={styles.subtitle}>
                Sin registros {direction === 'PAYABLE' ? 'por pagar' : 'por cobrar'}
              </Text>
              <Text style={styles.body}>
                Registra una obligación anterior o un préstamo que se realiza ahora.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </DebtPage>
  );
}
