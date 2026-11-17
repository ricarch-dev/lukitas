import type { ReactNode } from 'react';
import type { AccountDto } from '@lukitas/contracts';
import type { SupportedMonetaryUnitCode } from '@lukitas/domain';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { cashPreview } from '../actions/debt-submit';
import { styles } from '../styles/debt-styles';

export function DebtPage({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.page}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function DebtField({
  label,
  value,
  onChange,
  numeric = false,
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        style={styles.input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function DebtChoice({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.choiceText, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

export function DebtButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function DebtLoadState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <View style={styles.group}>
      {loading ? (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.body}>Cargando…</Text>
        </>
      ) : null}
      {error ? (
        <>
          <Text accessibilityRole="alert" selectable style={styles.error}>
            {error}
          </Text>
          <DebtButton label="Reintentar" onPress={reload} />
        </>
      ) : null}
    </View>
  );
}

export function CashFields({
  accounts,
  accountId,
  amount,
  rate,
  currencyCode,
  disabled,
  onAccount,
  onAmount,
  onRate,
}: {
  accounts: readonly AccountDto[];
  accountId: string;
  amount: string;
  rate: string;
  currencyCode: SupportedMonetaryUnitCode;
  disabled: boolean;
  onAccount: (id: string) => void;
  onAmount: (value: string) => void;
  onRate: (value: string) => void;
}) {
  const selected = accounts.find((account) => account.id === accountId);
  let preview = '';
  try {
    preview = cashPreview(accountId, amount, rate, currencyCode, accounts).reduction;
  } catch {
    /* Incomplete input has no conversion preview. */
  }
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Cuenta del movimiento</Text>
      <View style={styles.choices}>
        {accounts
          .filter((account) => !account.archived)
          .map((account) => (
            <DebtChoice
              key={account.id}
              label={`${account.name} · ${account.currency.code}`}
              selected={account.id === accountId}
              disabled={disabled}
              onPress={() => onAccount(account.id)}
            />
          ))}
      </View>
      {!accounts.length ? (
        <Link href="/crear-cuenta" style={styles.body}>
          Primero agrega una cuenta
        </Link>
      ) : null}
      <DebtField
        label={`Monto en la cuenta${selected ? ` (${selected.currency.code})` : ''}`}
        value={amount}
        onChange={onAmount}
        numeric
        disabled={disabled}
      />
      {selected && selected.currency.code !== currencyCode ? (
        <DebtField
          label={`Tasa: 1 ${selected.currency.code} equivale a cuántos ${currencyCode}`}
          value={rate}
          onChange={onRate}
          numeric
          disabled={disabled}
          hint="Usa la tasa acordada para este movimiento. Quedará guardada en su historial."
        />
      ) : null}
      {preview ? (
        <Text accessibilityLiveRegion="polite" selectable style={styles.body}>
          Equivalente: {preview} {currencyCode}
        </Text>
      ) : null}
    </View>
  );
}
