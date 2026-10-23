import type { AccountDto, RecordTransactionRequest, TransferRequest } from '@lukitas/contracts';
import { useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';

type Mode = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export function MovementForm({
  accounts,
  mode,
  onClose,
  onSaved,
  onModeChange,
}: {
  readonly accounts: readonly AccountDto[];
  readonly mode: Mode | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
  readonly onModeChange: (mode: 'INCOME' | 'EXPENSE') => void;
}) {
  const { client } = useSession();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [manualRate, setManualRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ readonly input: string; readonly key: string } | null>(null);
  const locked = useRef(false);
  const activeSource = accounts.find((item) => item.id === source) ?? accounts[0];
  const activeDestination = accounts.find((item) => item.id === destination);

  async function submit() {
    if (locked.current || !mode) return;
    const value = amount.trim().replace(',', '.');
    const precision = activeSource?.currency.precision ?? 2;
    if (
      !activeSource ||
      !/^\d+(?:\.\d+)?$/.test(value) ||
      !Number.isFinite(Number(value)) ||
      Number(value) <= 0 ||
      (value.split('.')[1]?.length ?? 0) > precision
    ) {
      setError(`Ingresa un monto mayor que cero con hasta ${precision} decimales.`);
      return;
    }
    if (mode === 'TRANSFER' && (!activeDestination || activeSource.id === activeDestination.id)) {
      setError('Elige una cuenta de destino diferente a la de origen.');
      return;
    }
    if (
      manualRate.trim() &&
      (!/^\d+(?:\.\d+)?$/.test(manualRate.trim()) || Number(manualRate) <= 0)
    ) {
      setError('Ingresa una tasa de cambio mayor que cero.');
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const input = JSON.stringify([
        mode,
        activeSource.id,
        activeDestination?.id,
        value,
        note.trim(),
        manualRate.trim(),
      ]);
      if (attempt.current?.input !== input)
        attempt.current = {
          input,
          key: `movement-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      const key = attempt.current.key;
      if (mode === 'TRANSFER' && activeDestination) {
        const request: TransferRequest = {
          sourceAccountId: activeSource.id,
          destinationAccountId: activeDestination.id,
          amount: value,
          ...(manualRate.trim() ? { manualRate: manualRate.trim() } : {}),
        };
        await client.post('/transfers', request, key);
      } else {
        const request: RecordTransactionRequest = {
          kind: mode === 'INCOME' ? 'INCOME' : 'EXPENSE',
          amount: value,
          currencyCode: activeSource.currency.code,
          ...(note.trim() ? { note: note.trim() } : {}),
        };
        await client.post(
          `/accounts/${encodeURIComponent(activeSource.id)}/transactions`,
          request,
          key,
        );
      }
      setAmount('');
      setNote('');
      setDestination('');
      setSource('');
      setManualRate('');
      attempt.current = null;
      onSaved();
    } catch (value: unknown) {
      setError(
        value instanceof ApiError && value.code === 'MISSING_FX_RATE'
          ? 'No encontramos una tasa histórica. Ingresa una tasa de cambio para esta transferencia.'
          : 'No pudimos guardar el movimiento. Revisa los datos y vuelve a intentarlo.',
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }

  return (
    <Modal
      visible={mode !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>
            {mode === 'TRANSFER'
              ? 'Transferir entre cuentas'
              : mode === 'INCOME'
                ? 'Nuevo ingreso'
                : 'Nuevo egreso'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar formulario"
            onPress={onClose}
            disabled={busy}
          >
            <Text style={styles.link}>Cerrar</Text>
          </Pressable>
        </View>
        {mode !== 'TRANSFER' ? (
          <View style={styles.modes}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'EXPENSE' }}
              onPress={() => onModeChange('EXPENSE')}
              style={[styles.picker, mode === 'EXPENSE' && styles.selected]}
            >
              <Text style={styles.choiceText}>Egreso</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'INCOME' }}
              onPress={() => onModeChange('INCOME')}
              style={[styles.picker, mode === 'INCOME' && styles.selected]}
            >
              <Text style={styles.choiceText}>Ingreso</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.label}>{mode === 'TRANSFER' ? 'Cuenta de origen' : 'Cuenta'}</Text>
        {accounts.length ? (
          accounts.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: activeSource?.id === account.id }}
              onPress={() => setSource(account.id)}
              style={[styles.choice, activeSource?.id === account.id && styles.selected]}
            >
              <Text style={styles.choiceText}>
                {account.name} · {account.currency.code}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.hint}>Crea una cuenta antes de registrar movimientos.</Text>
        )}
        {mode === 'TRANSFER' ? (
          <>
            <Text style={styles.label}>Cuenta de destino</Text>
            {accounts
              .filter((account) => account.id !== activeSource?.id)
              .map((account) => (
                <Pressable
                  key={account.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: destination === account.id }}
                  onPress={() => setDestination(account.id)}
                  style={[styles.choice, destination === account.id && styles.selected]}
                >
                  <Text style={styles.choiceText}>
                    {account.name} · {account.currency.code}
                  </Text>
                </Pressable>
              ))}
            <Text style={styles.hint}>Solo registra dinero entre tus cuentas; no envía pagos.</Text>
            {activeDestination &&
            activeDestination.currency.code !== activeSource?.currency.code ? (
              <>
                <Text style={styles.label}>
                  Tasa de cambio (opcional si ya existe una tasa histórica)
                </Text>
                <TextInput
                  accessibilityLabel="Tasa de cambio"
                  value={manualRate}
                  onChangeText={setManualRate}
                  keyboardType="decimal-pad"
                  placeholder="Ej. 1.08"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  editable={!busy}
                />
              </>
            ) : null}
          </>
        ) : null}
        <Text style={styles.label}>Monto {activeSource?.currency.code ?? ''}</Text>
        <TextInput
          accessibilityLabel="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.muted}
          style={styles.input}
          editable={!busy}
        />
        {mode !== 'TRANSFER' ? (
          <>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              accessibilityLabel="Descripción"
              value={note}
              onChangeText={setNote}
              placeholder="¿En qué fue?"
              placeholderTextColor={colors.muted}
              style={styles.input}
              editable={!busy}
            />
          </>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !accounts.length, busy }}
          onPress={() => void submit()}
          disabled={busy || !accounts.length}
          style={styles.save}
        >
          {busy ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.saveText}>
              {mode === 'TRANSFER' ? 'Registrar transferencia' : 'Guardar movimiento'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 48, gap: 12, backgroundColor: colors.canvas, flexGrow: 1 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 23, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  link: { color: colors.primary, fontSize: 16, padding: 8 },
  label: { color: colors.ink, fontWeight: '600', fontSize: 15, marginTop: 10 },
  choice: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 14,
  },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  modes: { flexDirection: 'row', gap: 12 },
  picker: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceText: { color: colors.ink, fontSize: 15 },
  input: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.ink,
  },
  hint: { color: colors.body, lineHeight: 21 },
  error: { color: colors.error, paddingVertical: 8 },
  save: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveText: { color: colors.surface, fontWeight: '700', fontSize: 16 },
});
