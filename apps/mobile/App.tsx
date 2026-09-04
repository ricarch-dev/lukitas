import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SessionProvider } from './src/session/SessionContext';

export default function App() {
  return <SessionProvider><View style={{ flex: 1 }}><RootNavigator /><StatusBar style="auto" /></View></SessionProvider>;
}
