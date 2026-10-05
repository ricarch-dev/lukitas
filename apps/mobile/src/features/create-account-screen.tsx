import React, { useEffect, useRef, useState } from 'react';
import type { AccountDto } from '@lukitas/contracts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
import { useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSession } from '../session/SessionContext';
import { AccountInputError, submitAccount } from './create-account-submit';
import { AUTH_COLORS as colors } from './auth-screen-theme';

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
    client.get<AccountDto[]>('/accounts').then((accounts) => {
      if (!current) return;
      setBanks([...new Map(accounts.flatMap((account) => account.bankGroup ? [[account.bankGroup.id, account.bankGroup] as const] : [])).values()]);
    }).catch(() => {
      if (current) setError('No pudimos cargar tus bancos. Revisa tu conexión e intenta de nuevo.');
    }).finally(() => { if (current) setLoadingBanks(false); });
    return () => { current = false; };
  }, [client, reloadBanks]);

  const submit = async () => {
    if (lock.current || loadingBanks || error) return;
    lock.current = true;
    setBusy(true);
    const input = { name, balance, currencyCode, ...(newBank ? { bankName } : bankGroupId ? { bankGroupId } : {}) };
    const fingerprint = JSON.stringify(input);
    if (attempt.current.input !== fingerprint) attempt.current = { input: fingerprint, key: `account-${Date.now()}-${Math.random()}` };
    try {
      await submitAccount(input, client.post.bind(client), attempt.current.key);
      router.back();
    } catch (value: unknown) {
      setError(value instanceof AccountInputError ? value.message : 'No pudimos guardar la cuenta. Revisa tu conexión e intenta de nuevo.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const chooseBank = (id: string) => { setBankGroupId(id); setNewBank(false); setBankName(''); setError(''); };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 80, gap: 20, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <Text style={{ color: colors.body }}>Registra un saldo propio. No se conecta con el banco ni realiza transferencias.</Text>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>Nombre de la cuenta</Text>
        <TextInput accessibilityLabel="Nombre de la cuenta" value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="Ej. Cuenta corriente" placeholderTextColor={colors.muted} editable={!busy} style={{ color: colors.ink, borderColor: colors.fieldBorder, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 52 }} />
        <Text style={{ color: colors.ink, fontWeight: '700' }}>Moneda de la cuenta</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {currencies.map((code) => <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: currencyCode === code }} accessibilityLabel={code} onPress={() => { setCurrencyCode(code); setError(''); }} disabled={busy} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: currencyCode === code ? colors.primary : colors.fieldBorder }}><Text style={{ color: colors.ink }}>{code}</Text></Pressable>)}
        </View>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>Saldo inicial en {currencyCode}</Text>
        <TextInput accessibilityLabel={`Saldo inicial en ${currencyCode}`} keyboardType="decimal-pad" value={balance} onChangeText={(value) => { setBalance(value); setError(''); }} editable={!busy} style={{ color: colors.ink, borderColor: colors.fieldBorder, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 52 }} />
        <Text style={{ color: colors.ink, fontWeight: '700' }}>Banco (opcional)</Text>
        {loadingBanks ? <ActivityIndicator /> : <View style={{ gap: 8 }}>
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: !bankGroupId && !newBank }} onPress={() => chooseBank('')}><Text style={{ color: colors.ink }}>Sin banco</Text></Pressable>
          {banks.map((bank) => <Pressable key={bank.id} accessibilityRole="radio" accessibilityState={{ selected: bankGroupId === bank.id }} onPress={() => chooseBank(bank.id)}><Text style={{ color: colors.ink }}>{bank.name}</Text></Pressable>)}
          <Pressable accessibilityRole="radio" accessibilityState={{ selected: newBank }} onPress={() => { setNewBank(true); setBankGroupId(''); setError(''); }}><Text style={{ color: colors.ink }}>Agregar banco</Text></Pressable>
          {newBank ? <TextInput accessibilityLabel="Nombre del banco" placeholder="Nombre del banco" placeholderTextColor={colors.muted} value={bankName} onChangeText={(value) => { setBankName(value); setError(''); }} editable={!busy} style={{ color: colors.ink, borderColor: colors.fieldBorder, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 52 }} /> : null}
        </View>}
        {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" selectable style={{ color: colors.error }}>{error}</Text> : null}
        {error ? <Pressable accessibilityRole="button" onPress={() => { setError(''); setReloadBanks((value) => value + 1); }}><Text style={{ color: colors.ink }}>Reintentar</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy || loadingBanks || Boolean(error) }} disabled={busy || loadingBanks || Boolean(error)} onPress={() => void submit()} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}><Text style={{ color: colors.canvas, fontWeight: '700' }}>{busy ? 'Guardando…' : 'Crear cuenta'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
