import type { FinancialReportDto } from '@lukitas/contracts';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { reportDisclosure } from '../../../shared/presentation/financial-disclosure';

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
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        </View>
      </ScrollView>
    );
  if (!report)
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.body}>Cargando el informe…</Text>
        </View>
      </ScrollView>
    );
  const disclosure = reportDisclosure(report);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            Informe del período
          </Text>
          <Text style={styles.body}>
            {report.items.length} movimientos entre {report.from.slice(0, 10)} y{' '}
            {report.to.slice(0, 10)}
          </Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Moneda base: {report.baseCurrency}</Text>
          {disclosure.warning ? <Text style={styles.warning}>{disclosure.warning}</Text> : null}
          {disclosure.total ? (
            <Text selectable style={styles.total}>
              {disclosure.total}
            </Text>
          ) : null}
        </View>
        {report.warnings.length ? (
          <View style={styles.warnings}>
            {report.warnings.map((warning, index) => (
              <Text key={index} selectable style={styles.warning}>
                {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: 20, padding: 24, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 20 },
  heading: { gap: 8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  body: { color: colors.body, fontSize: 16 },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  summaryLabel: { color: colors.body, fontSize: 14, fontWeight: '600' },
  total: { color: colors.ink, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  warnings: { backgroundColor: colors.warningSurface, borderRadius: 12, gap: 8, padding: 16 },
  warning: { color: colors.warning, fontSize: 14, lineHeight: 21 },
  state: { alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 160 },
  error: {
    backgroundColor: colors.errorSurface,
    borderRadius: 10,
    color: colors.error,
    padding: 16,
    textAlign: 'center',
  },
});
