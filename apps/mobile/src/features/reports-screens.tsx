import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { useSession } from '../session/SessionContext';

export function ReportsScreen() {
  const { client } = useSession();
  const [report, setReport] = useState<any>();
  const [error, setError] = useState('');
  useEffect(() => {
    client
      .report({})
      .then(setReport)
      .catch((value) => setError(value instanceof Error ? value.message : 'Unable to load report'));
  }, [client]);
  if (error)
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.error}>{error}</Text>
      </SafeAreaView>
    );
  if (!report)
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Reports</Text>
      <Text>{report.items.length} transactions</Text>
      <Text>Base currency: {report.baseCurrency}</Text>
      {report.partial ? (
        <Text style={styles.warning}>Some transactions have no FX evidence.</Text>
      ) : (
        <Text>
          Total: {report.baseTotal} {report.baseCurrency}
        </Text>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, gap: 14, padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  warning: { color: '#9a6700' },
  error: { color: '#b42318' },
});
