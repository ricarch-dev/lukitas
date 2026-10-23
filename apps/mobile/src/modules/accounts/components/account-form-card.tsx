import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import type { AccountForm } from '../actions/create-selected-account';
import { INTERNATIONAL_ACCOUNTS, NATIONAL_ACCOUNTS } from '../presentation/account-catalog';

type Props = { form: AccountForm; onChange: (form: AccountForm) => void; disabled: boolean };

export function AccountFormCard({ form, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const options = form.region === 'national'
    ? NATIONAL_ACCOUNTS.map(({ code, name }) => ({ id: code, name }))
    : INTERNATIONAL_ACCOUNTS.map((name) => ({ id: name, name }));
  const set = (change: Partial<AccountForm>) => onChange({ ...form, ...change });
  const currency = form.region === 'national' ? 'VES' : 'USD';

  return (
    <View style={styles.card}>
      <View style={styles.field}>
        <Text style={styles.label}>Cuenta</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={form.provider ? `Cuenta: ${form.provider}` : 'Seleccionar cuenta'}
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => setOpen((value) => !value)}
          style={({ pressed }) => [styles.input, styles.select, pressed && styles.pressed]}
        >
          <Text style={form.provider ? styles.value : styles.placeholder}>{form.provider || 'Seleccionar cuenta'}</Text>
          <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
        </Pressable>
        {open ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Cuentas disponibles" style={styles.options}>
            {options.map(({ id, name }) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: form.provider === name, disabled }}
                disabled={disabled}
                onPress={() => { set({ provider: name }); setOpen(false); }}
                style={[styles.option, form.provider === name && styles.optionSelected]}
              >
                <Text style={[styles.optionText, form.provider === name && styles.optionTextSelected]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Etiqueta (opcional)</Text>
        <TextInput
          accessibilityLabel="Etiqueta (opcional)"
          placeholder="Ej. Ahorros, gastos diarios"
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          value={form.label}
          onChangeText={(label) => set({ label })}
          editable={!disabled}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Saldo en {currency}</Text>
        <TextInput
          accessibilityLabel={`Saldo inicial en ${currency}`}
          keyboardType="decimal-pad"
          value={form.balance}
          onChangeText={(balance) => set({ balance })}
          selectionColor={colors.primary}
          editable={!disabled}
          style={styles.input}
        />
      </View>
      {form.region === 'national' ? (
        <>
          <View style={styles.switchRow}>
            <View style={styles.switchDescription}>
              <Text style={styles.label}>¿Cuenta en dólares?</Text>
              <Text style={styles.hint}>Añade un saldo separado en USD.</Text>
            </View>
            <Switch
              accessibilityLabel="Cuenta en dólares"
              value={form.hasUsd}
              onValueChange={(hasUsd) => set({ hasUsd })}
              disabled={disabled}
              trackColor={{ false: colors.fieldBorder, true: colors.primary }}
            />
          </View>
          {form.hasUsd ? (
            <View style={styles.field}>
              <Text style={styles.label}>Saldo en USD</Text>
              <TextInput
                accessibilityLabel="Saldo inicial en USD"
                keyboardType="decimal-pad"
                value={form.usdBalance}
                onChangeText={(usdBalance) => set({ usdBalance })}
                selectionColor={colors.primary}
                editable={!disabled}
                style={styles.input}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 24, gap: 20 },
  field: { gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.body, fontSize: 13 },
  input: { backgroundColor: colors.surface, borderColor: colors.fieldBorder, borderWidth: 1, borderRadius: 10, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { color: colors.ink, fontSize: 16, flexShrink: 1 },
  placeholder: { color: colors.muted, fontSize: 16 },
  chevron: { color: colors.primary, fontSize: 20 },
  options: { borderRadius: 10, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderBottomColor: colors.border, borderBottomWidth: 1 },
  optionSelected: { backgroundColor: colors.softSurface },
  optionText: { color: colors.body, fontSize: 15 },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchDescription: { flex: 1, gap: 4 },
  pressed: { opacity: 0.72 },
});
