import React, { useEffect, useRef, useState } from 'react';
import type { AccountDto } from '@lukitas/contracts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSession } from '../session/SessionContext';
import { AccountInputError, submitAccount } from './create-account-submit';
import { APP_COLORS as colors } from '../shared/theme/app-colors';

const currencies: readonly SupportedMonetaryUnitCode[] = ['VES', 'USD', 'USDT', 'EUR', 'GBP'];

export function CreateAccountScreen() {
  const { client } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [currencyCode, setCurrencyCode] = useState<SupportedMonetaryUnitCode>('VES');
  const [bankName, setBankName] = useState('');
  const [bankGroupId, setBankGroupId] = useState('');
  const [newBank, setNewBank] = useState(false);
  const [banks, setBanks] = useState<NonNullable<AccountDto['bankGroup']>[]>([]);
  const [error, setError] = useState('');
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [reloadBanks, setReloadBanks] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const attempt = useRef({ input: '', key: '' });

  useEffect(() => {
    let current = true;
    setLoadingBanks(true);
    client
      .get<AccountDto[]>('/accounts')
      .then((accounts) => {
        if (!current) return;
        setBanks([
          ...new Map(
            accounts.flatMap((account) =>
              account.bankGroup ? [[account.bankGroup.id, account.bankGroup] as const] : [],
            ),
          ).values(),
        ]);
      })
      .catch(() => {
        if (current)
          setError('No pudimos cargar tus bancos. Revisa tu conexión e intenta de nuevo.');
      })
      .finally(() => {
        if (current) setLoadingBanks(false);
      });
    return () => {
      current = false;
    };
  }, [client, reloadBanks]);

  const submit = async () => {
    if (lock.current || loadingBanks || error) return;
    lock.current = true;
    setBusy(true);
    const input = {
      name,
      balance,
      currencyCode,
      ...(newBank ? { bankName } : bankGroupId ? { bankGroupId } : {}),
    };
    const fingerprint = JSON.stringify(input);
    if (attempt.current.input !== fingerprint)
      attempt.current = {
        input: fingerprint,
        key: `account-${Date.now()}-${Math.random()}`,
      };
    try {
      await submitAccount(input, client.post.bind(client), attempt.current.key);
      router.back();
    } catch (value: unknown) {
      setError(
        value instanceof AccountInputError
          ? value.message
          : 'No pudimos guardar la cuenta. Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const chooseBank = (id: string) => {
    setBankGroupId(id);
    setNewBank(false);
    setBankName('');
    setError('');
  };
  const disabled = busy || loadingBanks || Boolean(error);

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.introduction}>
          <Text accessibilityRole="header" style={styles.heading}>
            Crear cuenta
          </Text>
          <Text style={styles.body}>
            Registra un saldo propio. No se conecta con el banco ni realiza transferencias.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre de la cuenta</Text>
          <TextInput
            accessibilityLabel="Nombre de la cuenta"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError('');
            }}
            placeholder="Ej. Cuenta corriente"
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            editable={!busy}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Moneda de la cuenta</Text>
          <View style={styles.currencyChoices}>
            {currencies.map((code) => {
              const selected = currencyCode === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={code}
                  onPress={() => {
                    setCurrencyCode(code);
                    setError('');
                  }}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.currencyChoice,
                    selected && styles.currencyChoiceSelected,
                    pressed && styles.choicePressed,
                  ]}
                >
                  <Text style={[styles.currencyText, selected && styles.currencyTextSelected]}>
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Saldo inicial en {currencyCode}</Text>
          <TextInput
            accessibilityLabel={`Saldo inicial en ${currencyCode}`}
            keyboardType="decimal-pad"
            value={balance}
            onChangeText={(value) => {
              setBalance(value);
              setError('');
            }}
            selectionColor={colors.primary}
            editable={!busy}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Banco (opcional)</Text>
          {loadingBanks ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.bankChoices}>
              {[
                {
                  id: '',
                  label: 'Sin banco',
                  selected: !bankGroupId && !newBank,
                  onPress: () => chooseBank(''),
                },
                ...banks.map((bank) => ({
                  id: bank.id,
                  label: bank.name,
                  selected: bankGroupId === bank.id,
                  onPress: () => chooseBank(bank.id),
                })),
                {
                  id: 'new-bank',
                  label: 'Agregar banco',
                  selected: newBank,
                  onPress: () => {
                    setNewBank(true);
                    setBankGroupId('');
                    setError('');
                  },
                },
              ].map((option) => (
                <Pressable
                  key={option.id || 'no-bank'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: option.selected, disabled: busy }}
                  onPress={option.onPress}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.bankChoice,
                    option.selected && styles.bankChoiceSelected,
                    pressed && styles.choicePressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.bankChoiceText,
                      option.selected && styles.bankChoiceTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              {newBank ? (
                <View style={styles.newBankField}>
                  <Text style={styles.label}>Nombre del banco</Text>
                  <TextInput
                    accessibilityLabel="Nombre del banco"
                    placeholder="Nombre del banco"
                    placeholderTextColor={colors.muted}
                    value={bankName}
                    onChangeText={(value) => {
                      setBankName(value);
                      setError('');
                    }}
                    selectionColor={colors.primary}
                    editable={!busy}
                    style={styles.input}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              selectable
              style={styles.error}
            >
              {error}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setError('');
                setReloadBanks((value) => value + 1);
              }}
              style={({ pressed }) => [styles.retry, pressed && styles.choicePressed]}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled }}
          disabled={disabled}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.submit,
            disabled && styles.submitDisabled,
            pressed && !disabled && styles.submitPressed,
          ]}
        >
          <Text style={styles.submitText}>{busy ? 'Guardando…' : 'Crear cuenta'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { backgroundColor: colors.canvas, flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 20,
    maxWidth: 560,
    padding: 24,
    paddingBottom: 80,
    width: '100%',
  },
  introduction: { gap: 8 },
  heading: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  body: { color: colors.body, fontSize: 15, lineHeight: 22 },
  field: { gap: 10 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.fieldBorder,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  currencyChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  currencyChoice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.fieldBorder,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: 12,
  },
  currencyChoiceSelected: { backgroundColor: colors.softSurface, borderColor: colors.primary },
  currencyText: { color: colors.body, fontSize: 14, fontWeight: '600' },
  currencyTextSelected: { color: colors.primary },
  choicePressed: { opacity: 0.72 },
  bankChoices: { gap: 8 },
  bankChoice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  bankChoiceSelected: { backgroundColor: colors.softSurface, borderColor: colors.primary },
  bankChoiceText: { color: colors.body, fontSize: 15 },
  bankChoiceTextSelected: { color: colors.primary, fontWeight: '600' },
  newBankField: { gap: 8, paddingTop: 4 },
  errorContainer: { backgroundColor: colors.errorSurface, borderRadius: 10, gap: 8, padding: 14 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  retryText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  submitDisabled: { backgroundColor: colors.disabled },
  submitPressed: { backgroundColor: colors.primaryPressed },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
