import { useEffect, useRef, useState } from 'react';
import type { AccountDto } from '@lukitas/contracts';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { AccountInputError } from '../actions/create-account-submit';
import {
  createSelectedAccount,
  primaryAccountFingerprint,
  type AccountForm,
} from '../actions/create-selected-account';
import { AccountFormCard } from '../components/account-form-card';

const emptyForm = (region: AccountForm['region']): AccountForm => ({
  region,
  provider: '',
  label: '',
  balance: '0',
  hasUsd: false,
  usdBalance: '0',
});

export function CreateAccountScreen() {
  const insets = useSafeAreaInsets();
  const { client } = useSession();
  const router = useRouter();
  const [region, setRegion] = useState<AccountForm['region']>('national');
  const [national, setNational] = useState<AccountForm>(() => emptyForm('national'));
  const [international, setInternational] = useState<AccountForm>(() => emptyForm('international'));
  const [banks, setBanks] = useState<NonNullable<AccountDto['bankGroup']>[]>([]);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const lock = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const form = region === 'national' ? national : international;

  useEffect(() => {
    let current = true;
    setLoading(true);
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
        setLoadError(false);
      })
      .catch(() => {
        if (current) {
          setLoadError(true);
          setError('No pudimos cargar tus cuentas. Revisa tu conexión e intenta de nuevo.');
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [client, reload]);

  const changeForm = (next: AccountForm) => {
    if (region === 'national') setNational(next);
    else setInternational(next);
    if (!loadError) setError('');
  };

  const submit = async () => {
    if (lock.current || loading || loadError) return;
    lock.current = true;
    setBusy(true);
    const fingerprint = primaryAccountFingerprint(form);
    let key = attempts.current.get(fingerprint);
    if (!key) {
      key = `account-${Date.now()}-${Math.random()}`;
      attempts.current.set(fingerprint, key);
    }
    try {
      await createSelectedAccount(form, banks, client.post.bind(client), key);
      setRetryPending(false);
      router.back();
    } catch (value: unknown) {
      if (!(value instanceof AccountInputError)) setRetryPending(true);
      setError(
        value instanceof AccountInputError
          ? value.message
          : form.region === 'national' && form.hasUsd
            ? 'No pudimos completar los saldos. Si el saldo en bolívares ya aparece, vuelve a intentar para añadir el saldo en dólares sin duplicarlo.'
            : 'No pudimos guardar la cuenta. Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

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
        <View accessibilityRole="tablist" style={styles.tabs}>
          {(['national', 'international'] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected: region === option, disabled: busy || retryPending }}
              onPress={() => {
                setRegion(option);
                if (!loadError) setError('');
              }}
              disabled={busy || retryPending}
              style={[styles.tab, region === option && styles.selectedTab]}
            >
              <Text style={[styles.tabText, region === option && styles.selectedTabText]}>
                {option === 'national' ? 'Nacional' : 'Internacional'}
              </Text>
            </Pressable>
          ))}
        </View>
        <AccountFormCard
          form={form}
          onChange={changeForm}
          disabled={busy || loading || retryPending}
        />
        {error ? (
          <View style={styles.errorBox}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              selectable
              style={styles.error}
            >
              {error}
            </Text>
            {loadError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError('');
                  setReload((value) => value + 1);
                }}
                style={styles.retry}
              >
                <Text style={styles.retryText}>Reintentar carga</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy || loading || loadError || !form.provider }}
          disabled={busy || loading || loadError || !form.provider}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.submit,
            (busy || loading || loadError || !form.provider) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitText}>
            {busy ? 'Guardando…' : retryPending ? 'Reintentar creación' : 'Crear cuenta'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.canvas },
  content: { alignSelf: 'center', width: '100%', maxWidth: 560, padding: 20, gap: 20 },
  footer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.canvas,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.segmentSurface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 9 },
  selectedTab: { backgroundColor: colors.primary },
  tabText: { color: colors.body, fontWeight: '600', fontSize: 14 },
  selectedTabText: { color: colors.surface },
  errorBox: { backgroundColor: colors.errorSurface, borderRadius: 10, padding: 14, gap: 8 },
  error: { color: colors.error, lineHeight: 20 },
  retry: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  retryText: { color: colors.primary, fontWeight: '600' },
  submit: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: { backgroundColor: colors.disabled },
  pressed: { backgroundColor: colors.primaryPressed },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
