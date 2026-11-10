import { useState } from 'react';
import { Banknote, ChevronRight, CircleDollarSign, Tag, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import type { AccountForm } from '../actions/create-selected-account';
import { formatAccountAmount } from '../presentation/account-amount';
import { AccountAmountSheet } from './account-amount-sheet';
import { AccountPickerSheet } from './account-picker-sheet';

type Props = { form: AccountForm; onChange: (form: AccountForm) => void; disabled: boolean };
type ActiveSheet = 'provider' | 'balance' | 'usd' | null;

export function AccountFormCard({ form, onChange, disabled }: Props) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const set = (change: Partial<AccountForm>) => onChange({ ...form, ...change });
  const currency = form.region === 'national' ? 'VES' : 'USD';

  return (
    <>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={form.provider ? `Cuenta: ${form.provider}` : 'Seleccionar cuenta'}
          accessibilityHint="Abre la lista de cuentas disponibles"
          disabled={disabled}
          onPress={() => setActiveSheet('provider')}
          style={styles.row}
        >
          <Wallet color={colors.muted} size={21} aria-hidden={true} />
          <Text style={styles.label}>Cuenta</Text>
          <Text numberOfLines={1} style={[styles.rowValue, !form.provider && styles.placeholder]}>
            {form.provider || 'Selecciona una'}
          </Text>
          <ChevronRight color={colors.muted} size={18} aria-hidden={true} />
        </Pressable>

        <View style={styles.row}>
          <Tag color={colors.muted} size={21} aria-hidden={true} />
          <Text style={styles.label}>Etiqueta</Text>
          <TextInput
            accessibilityLabel="Etiqueta (opcional)"
            placeholder="Opcional"
            placeholderTextColor={colors.muted}
            selectionColor={colors.primary}
            value={form.label}
            onChangeText={(label) => set({ label })}
            editable={!disabled}
            style={styles.labelInput}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={currency === 'VES' ? 'Saldo en Bs' : 'Saldo inicial en USD'}
          accessibilityHint="Abre el teclado de montos"
          disabled={disabled}
          onPress={() => setActiveSheet('balance')}
          style={[styles.row, form.region === 'international' && styles.lastRow]}
        >
          <Banknote color={colors.muted} size={21} aria-hidden={true} />
          <Text style={styles.label}>{currency === 'VES' ? 'Saldo en Bs' : 'Saldo inicial'}</Text>
          <Text style={styles.rowValue}>{formatAccountAmount(form.balance, currency)}</Text>
          <ChevronRight color={colors.muted} size={18} aria-hidden={true} />
        </Pressable>

        {form.region === 'national' ? (
          <>
            <View style={[styles.row, !form.hasUsd && styles.lastRow]}>
              <CircleDollarSign color={colors.muted} size={21} aria-hidden={true} />
              <Text style={styles.label}>Cuenta en dólares</Text>
              <Switch
                accessibilityLabel="Cuenta en dólares"
                value={form.hasUsd}
                onValueChange={(hasUsd) => set({ hasUsd })}
                disabled={disabled}
                trackColor={{ false: colors.fieldBorder, true: colors.primary }}
              />
            </View>
            {form.hasUsd ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Saldo inicial en USD"
                accessibilityHint="Abre el teclado de montos"
                disabled={disabled}
                onPress={() => setActiveSheet('usd')}
                style={[styles.row, styles.lastRow]}
              >
                <Banknote color={colors.muted} size={21} aria-hidden={true} />
                <Text style={styles.label}>Saldo en USD</Text>
                <Text style={styles.rowValue}>{formatAccountAmount(form.usdBalance, 'USD')}</Text>
                <ChevronRight color={colors.muted} size={18} aria-hidden={true} />
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>

      <AccountPickerSheet
        visible={activeSheet === 'provider'}
        region={form.region}
        selected={form.provider}
        onSelect={(provider) => set({ provider })}
        onClose={() => setActiveSheet(null)}
      />
      <AccountAmountSheet
        visible={activeSheet === 'balance'}
        title={currency === 'VES' ? 'Saldo en Bs' : 'Saldo inicial'}
        currency={currency}
        value={form.balance}
        onConfirm={(balance) => {
          set({ balance });
          setActiveSheet(null);
        }}
        onClose={() => setActiveSheet(null)}
      />
      {form.region === 'national' ? (
        <AccountAmountSheet
          visible={activeSheet === 'usd'}
          title="Saldo en USD"
          currency="USD"
          value={form.usdBalance}
          onConfirm={(usdBalance) => {
            set({ usdBalance });
            setActiveSheet(null);
          }}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
  },
  lastRow: { borderBottomWidth: 0 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '500' },
  rowValue: { color: colors.body, flex: 1, fontSize: 15, textAlign: 'right' },
  placeholder: { color: colors.muted },
  labelInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 48,
    minWidth: 0,
    paddingVertical: 8,
    textAlign: 'right',
  },
});
