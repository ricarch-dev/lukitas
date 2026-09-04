import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSession } from '../session/SessionContext';

export function PlanningScreen() {
  const { client } = useSession();
  const [categories, setCategories] = useState<Array<any>>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    client
      .categories()
      .then(setCategories)
      .catch((value) =>
        setError(value instanceof Error ? value.message : 'Unable to load planning'),
      );
  useEffect(() => {
    void load();
  }, [client]);
  const create = async () => {
    if (!name.trim()) return;
    try {
      await client.post('/categories', { name }, `category-${Date.now()}`);
      setName('');
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to create category');
    }
  };
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Planning</Text>
      <Text style={styles.subtitle}>Categories</Text>
      <View style={styles.form}>
        <TextInput
          placeholder="New category"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <Button title="Add" onPress={create} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!categories.length ? (
        <ActivityIndicator />
      ) : (
        categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text>{category.name}</Text>
            <Text>{category.archived ? 'Archived' : 'Active'}</Text>
          </View>
        ))
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, gap: 14, padding: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 18, fontWeight: '600' },
  input: { borderColor: '#bbb', borderRadius: 8, borderWidth: 1, flex: 1, padding: 12 },
  form: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  error: { color: '#b42318' },
});
