import type { FinancialReportDto } from '@lukitas/contracts';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { useSession } from '../session/SessionContext';
import { AUTH_COLORS as colors } from './auth-screen-theme';
import { reportDisclosure } from './financial-disclosure';

export function ReportsScreen() {
  const { client } = useSession();
  const [report, setReport] = useState<FinancialReportDto | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    client
      .get<FinancialReportDto>('/reports')
      .then(setReport)
      .catch(() =>
        setError('No pudimos cargar el informe. Revisa tu conexión e intenta de nuevo.'),
      );
  }, [client]);
  if (error)
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      </ScrollView>
    );
  if (!report)
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
        <ActivityIndicator />
      </ScrollView>
    );
  const disclosure = reportDisclosure(report);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
      <Text accessibilityRole="header" style={styles.title}>
        Informe del período
      </Text>
      <Text style={styles.body}>
        {report.items.length} movimientos entre {report.from.slice(0, 10)} y{' '}
        {report.to.slice(0, 10)}
      </Text>
      <Text style={styles.body}>Moneda base: {report.baseCurrency}</Text>
      {disclosure.warning ? <Text style={styles.warning}>{disclosure.warning}</Text> : null}
      {disclosure.total ? (
        <Text selectable style={styles.body}>
          {disclosure.total}
        </Text>
      ) : null}
      {report.warnings.map((warning, index) => (
        <Text key={index} selectable style={styles.warning}>
          {warning}
        </Text>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: 14, padding: 24, backgroundColor: colors.canvas },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  body: { color: colors.body, fontSize: 16 },
  warning: { color: '#795200', fontSize: 14 },
  error: { color: colors.error },
});
