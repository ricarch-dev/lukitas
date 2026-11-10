import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import {
  applyAmountKey,
  amountDigits,
  amountFromDigits,
  formatAccountAmount,
  type AmountKey,
} from '../presentation/account-amount';
import { AccountSheet } from './account-sheet';

const rows: readonly (readonly (AmountKey | null)[])[] = [
  ['1', '2', '3', 'clear'],
  ['4', '5', '6', null],
  ['7', '8', '9', null],
  ['00', '0', 'backspace', null],
];

type Props = {
  visible: boolean;
  title: string;
  value: string;
  currency: 'VES' | 'USD';
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function AccountAmountSheet({ visible, title, value, currency, onConfirm, onClose }: Props) {
  const [digits, setDigits] = useState(() => amountDigits(value));
  useEffect(() => {
    if (visible) setDigits(amountDigits(value));
  }, [visible, value]);
  return (
    <AccountSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={() => onConfirm(amountFromDigits(digits))}
    >
      <Text selectable accessibilityLiveRegion="polite" style={styles.amount}>
        {currency === 'VES' ? 'Bs ' : '$ '}
        {formatAccountAmount(amountFromDigits(digits), currency)}
      </Text>
      <View style={styles.keypad}>
        {rows.map((row, index) => (
          <View key={index} style={styles.keyRow}>
            {row.map((key, column) =>
              key === null ? (
                <View key={column} style={styles.key} />
              ) : (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={
                    key === 'clear'
                      ? 'Borrar monto'
                      : key === 'backspace'
                        ? 'Borrar último dígito'
                        : key
                  }
                  onPress={() => setDigits((current) => applyAmountKey(current, key))}
                  style={({ pressed }) => [
                    styles.key,
                    styles.keyButton,
                    pressed && styles.keyPressed,
                  ]}
                >
                  <Text style={[styles.keyText, key === 'clear' && styles.clearText]}>
                    {key === 'clear' ? 'C' : key === 'backspace' ? '⌫' : key}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>
    </AccountSheet>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.ink,
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    paddingVertical: 18,
    textAlign: 'center',
  },
  keypad: { gap: 8 },
  keyRow: { flexDirection: 'row', gap: 8 },
  key: { flex: 1, minHeight: 58 },
  keyButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.subtleSurface },
  keyText: { color: colors.ink, fontSize: 20, fontWeight: '600' },
  clearText: { color: colors.warning },
  hint: { color: colors.body, fontSize: 12, textAlign: 'center' },
});
