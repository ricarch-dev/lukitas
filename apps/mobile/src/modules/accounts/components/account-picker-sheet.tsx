import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { INTERNATIONAL_ACCOUNTS, NATIONAL_ACCOUNTS } from '../presentation/account-catalog';
import type { AccountForm } from '../actions/create-selected-account';
import { AccountSheet } from './account-sheet';

type Props = {
  visible: boolean;
  region: AccountForm['region'];
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
};

export function AccountPickerSheet({ visible, region, selected, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const options =
    region === 'national'
      ? NATIONAL_ACCOUNTS.map(({ code, name }) => ({ id: code, name }))
      : INTERNATIONAL_ACCOUNTS.map((name) => ({ id: name, name }));
  const filtered = options.filter(({ name }) =>
    name.toLocaleLowerCase('es-VE').includes(search.trim().toLocaleLowerCase('es-VE')),
  );
  const close = () => {
    setSearch('');
    onClose();
  };
  return (
    <AccountSheet
      visible={visible}
      title={region === 'national' ? 'Banco' : 'Billetera'}
      onClose={close}
    >
      <TextInput
        accessibilityLabel={region === 'national' ? 'Buscar banco' : 'Buscar billetera'}
        placeholder={region === 'national' ? 'Buscar banco...' : 'Buscar billetera...'}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <ScrollView
        keyboardShouldPersistTaps="always"
        contentInsetAdjustmentBehavior="automatic"
        style={styles.list}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Cuentas disponibles"
          style={styles.options}
        >
          {filtered.length ? (
            filtered.map(({ id, name }, index) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityLabel={name}
                accessibilityState={{ selected: selected === name }}
                onPress={() => {
                  onSelect(name);
                  close();
                }}
                style={[styles.option, index < filtered.length - 1 && styles.divider]}
              >
                <Text style={styles.optionName}>{name}</Text>
                <Text
                  accessible={false}
                  style={[styles.radio, selected === name && styles.radioSelected]}
                >
                  {selected === name ? '✓' : ''}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.empty}>No hay cuentas que coincidan.</Text>
          )}
        </View>
      </ScrollView>
    </AccountSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  list: { flexGrow: 0 },
  options: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 16 },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 58,
  },
  divider: { borderBottomColor: colors.border, borderBottomWidth: 1 },
  optionName: { color: colors.ink, flex: 1, fontSize: 15 },
  radio: {
    borderColor: colors.fieldBorder,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.surface,
    height: 24,
    textAlign: 'center',
    width: 24,
  },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  empty: { color: colors.body, fontSize: 14, paddingVertical: 18 },
});
