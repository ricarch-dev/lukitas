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
import { useSession } from '../../../session/SessionContext';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';

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
      <View style={styles.introduction}>
        <Text style={styles.subtitle}>Categorías</Text>
        <Text style={styles.hint}>Organiza tus movimientos por categoría.</Text>
      </View>
      <View style={styles.formSection}>
        <Text style={styles.label}>Nombre de la categoría</Text>
        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Nombre de la nueva categoría"
            placeholder="Ej. Alimentación"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void create()}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Agregar</Text>
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {categories === null && !error ? (
        <ActivityIndicator />
      ) : categories?.length ? (
        <View style={styles.categoryList}>
          {categories.map((category) => (
            <View key={category.id} style={styles.row}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={[styles.status, category.archived ? styles.archived : styles.active]}>
                {category.archived ? 'Archivada' : 'Activa'}
              </Text>
            </View>
          ))}
        </View>
      ) : !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.categoryName}>Todavía no tienes categorías.</Text>
          <Text style={styles.hint}>Agrega una categoría para organizar tus movimientos.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    backgroundColor: colors.canvas,
    flexGrow: 1,
    gap: 20,
    maxWidth: 760,
    padding: 24,
    width: '100%',
  },
  introduction: { gap: 8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.ink, fontSize: 20, fontWeight: '600' },
  hint: { color: colors.body, fontSize: 15 },
  formSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: {
    color: colors.ink,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  form: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '600' },
  categoryList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  categoryName: { color: colors.ink, flexShrink: 1, fontSize: 15, fontWeight: '600' },
  status: {
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  active: { backgroundColor: colors.softSurface, color: colors.primary },
  archived: { backgroundColor: colors.subtleSurface, color: colors.body },
  emptyState: { backgroundColor: colors.softSurface, borderRadius: 12, gap: 8, padding: 18 },
  error: { color: colors.error },
});
