import * as SecureStore from 'expo-secure-store';
import { createSessionStorage } from './storage-core';

// Feature code depends on this adapter, while tests can inject an in-memory KeyValueStore.
export const sessionStorage = createSessionStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});
