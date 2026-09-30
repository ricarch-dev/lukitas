import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSession } from '../session/SessionContext';
import { AUTH_COLORS as colors } from './auth-screen-theme';

export function PlanningScreen() {
  const { client } = useSession();
  const [categories, setCategories] = useState<Awaited<
    ReturnType<typeof client.categories>
  > | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    client
      .categories()
      .then(setCategories)
      .catch(() =>
        setError('No pudimos cargar las categorías. Revisa tu conexión e intenta de nuevo.'),
      );
  useEffect(() => {
    void load();
  }, [client]);
  const create = async () => {
    if (!name.trim()) return;
    try {
      await client.post('/categories', { name: name.trim() }, `category-${Date.now()}`);
      setName('');
      await load();
    } catch {
      setError('No pudimos crear la categoría. Revisa tu conexión e intenta de nuevo.');
    }
  };
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.root}>
      <Text accessibilityRole="header" style={styles.title}>
        Planificación
      </Text>
      <Text style={styles.subtitle}>Categorías</Text>
      <Text style={styles.hint}>Organiza tus movimientos por categoría.</Text>
      <View style={styles.form}>
        <TextInput
          accessibilityLabel="Nombre de la nueva categoría"
          placeholder="Nombre de la categoría"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={() => void create()} style={styles.button}>
          <Text style={styles.buttonText}>Agregar</Text>
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {categories === null && !error ? (
        <ActivityIndicator />
      ) : categories?.length ? (
        categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.hint}>{category.name}</Text>
            <Text style={styles.hint}>{category.archived ? 'Archivada' : 'Activa'}</Text>
          </View>
        ))
      ) : !error ? (
        <Text style={styles.hint}>Todavía no tienes categorías.</Text>
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flexGrow: 1, gap: 14, padding: 24, backgroundColor: colors.canvas },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.ink, fontSize: 20, fontWeight: '600' },
  hint: { color: colors.body, fontSize: 15 },
  input: {
    color: colors.ink,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 12,
  },
  form: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, minHeight: 48 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 10,
  },
  error: { color: colors.error },
});
