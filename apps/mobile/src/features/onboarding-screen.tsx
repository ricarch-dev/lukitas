import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSession } from '../session/SessionContext';
import { AUTH_COLORS as colors } from './auth-screen-theme';
import { OnboardingInputError, submitOnboarding } from './onboarding-submit';

export function OnboardingScreen({ onComplete }: { readonly onComplete: () => void }) {
  const { client } = useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 880;
  const [name, setName] = useState('Cuenta principal');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<'name' | 'balance' | 'submit' | null>(null);
  const lock = useRef(false);
  const balanceInput = useRef<TextInput | null>(null);
  const attemptKey = useRef<string | null>(null);
  const lastInput = useRef('');

  const submit = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const input = JSON.stringify([name, balance]);
    if (attemptKey.current === null || lastInput.current !== input) {
      attemptKey.current = `onboarding-${Date.now()}`;
      lastInput.current = input;
    }
    try {
      await submitOnboarding(
        name,
        balance,
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        client.post.bind(client),
        attemptKey.current,
      );
      onComplete();
    } catch (value: unknown) {
      setError(
        value instanceof OnboardingInputError
          ? value.message
          : 'No pudimos guardar tu cuenta. Revisa tu conexión e intenta de nuevo.',
      );
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined
      }
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: width < 480 ? 20 : 40 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.layout, wide && styles.wide]}>
          <View style={[styles.intro, wide && styles.introWide]}>
            <View style={styles.wordmark}>
              <View style={styles.mark}>
                <Text style={styles.markText}>L</Text>
              </View>
              <Text style={styles.brand}>lukitas</Text>
            </View>
            <Text accessibilityRole="header" style={styles.heading}>
              Todo empieza con tu primera cuenta.
            </Text>
            <Text style={styles.description}>
              Agrega el dinero que ya tienes y empieza a organizar tus movimientos.
            </Text>
            <Text style={styles.note}>
              Una cuenta puede ser tu banco, efectivo o una billetera digital.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formHeader}>
              <Text accessibilityRole="header" style={styles.title}>
                Configura tu cuenta
              </Text>
              <Text style={styles.body}>Solo necesitas un nombre y tu saldo actual.</Text>
            </View>
            <View style={styles.field}>
              <Text nativeID="account-name-label" style={styles.label}>
                Nombre de la cuenta
              </Text>
              <TextInput
                accessibilityLabel="Nombre de la cuenta"
                accessibilityLabelledBy="account-name-label"
                value={name}
                onChangeText={setName}
                editable={!busy}
                onFocus={() => setFocus('name')}
                onBlur={() => setFocus(null)}
                onSubmitEditing={() => balanceInput.current?.focus()}
                returnKeyType="next"
                placeholder="Ej. Efectivo o banco"
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
                style={[styles.input, focus === 'name' && styles.focused]}
              />
            </View>
            <View style={styles.field}>
              <Text nativeID="opening-balance-label" style={styles.label}>
                Saldo inicial
              </Text>
              <View style={[styles.amountField, focus === 'balance' && styles.focused]}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  ref={balanceInput}
                  accessibilityLabel="Saldo inicial en dólares estadounidenses"
                  accessibilityLabelledBy="opening-balance-label"
                  value={balance}
                  onChangeText={setBalance}
                  editable={!busy}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => void submit()}
                  onFocus={() => setFocus('balance')}
                  onBlur={() => setFocus(null)}
                  selectionColor={colors.primary}
                  style={styles.amountInput}
                />
                <Text style={styles.currency}>USD</Text>
              </View>
              <Text style={styles.hint}>Puedes empezar con 0. Usa hasta 2 decimales.</Text>
            </View>
            <View style={styles.currencyNote}>
              <Text style={styles.label}>Moneda inicial: dólares (USD)</Text>
              <Text style={styles.hint}>
                Esta cuenta y tu balance principal se guardarán en USD.
              </Text>
            </View>
            {error ? (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={() => void submit()}
              onFocus={() => setFocus('submit')}
              onBlur={() => setFocus(null)}
              style={({ pressed }) => [
                styles.submit,
                pressed && styles.pressed,
                busy && styles.disabled,
                focus === 'submit' && styles.focused,
              ]}
            >
              {busy ? <ActivityIndicator color={colors.ink} /> : null}
              <Text style={styles.submitText}>
                {busy ? 'Guardando tu cuenta…' : 'Crear cuenta y empezar'}
              </Text>
            </Pressable>
            <Text style={styles.footer}>
              Aquí registras tu dinero. No se realizan pagos ni transferencias.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 36 },
  layout: { width: '100%', maxWidth: 500, gap: 28 },
  wide: { maxWidth: 1000, flexDirection: 'row', alignItems: 'center', gap: 64 },
  intro: { gap: 16 },
  introWide: { flex: 1 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.surface, fontSize: 24, fontWeight: '800' },
  brand: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  heading: { color: colors.ink, fontSize: 32, lineHeight: 39, fontWeight: '700' },
  description: { color: colors.body, fontSize: 16, lineHeight: 25 },
  note: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  form: {
    flexShrink: 1,
    width: '100%',
    maxWidth: 472,
    gap: 22,
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  formHeader: { gap: 8 },
  title: { color: colors.ink, fontSize: 25, lineHeight: 32, fontWeight: '700' },
  body: { color: colors.body, fontSize: 15, lineHeight: 23 },
  field: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  input: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.fieldBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.fieldBorder,
    paddingHorizontal: 14,
  },
  dollar: { fontSize: 22, color: colors.ink, fontWeight: '600' },
  amountInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    color: colors.ink,
    fontSize: 22,
    paddingVertical: 12,
  },
  currency: { color: colors.body, fontSize: 14, fontWeight: '600' },
  focused: { borderColor: colors.primary },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  currencyNote: { gap: 4 },
  error: {
    color: colors.error,
    backgroundColor: colors.errorSurface,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  submit: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    minHeight: 56,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { backgroundColor: colors.disabled },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
