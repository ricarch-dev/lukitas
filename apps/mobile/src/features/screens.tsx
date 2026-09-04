import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSession } from "../session/SessionContext";

export function AuthScreen() {
  const { client, setTokens } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.post<any>("/auth/login", { email, password });
      await setTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Sign in to lukitas</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Sign in" onPress={submit} />
      )}
    </SafeAreaView>
  );
}

export function OnboardingScreen() {
  const { client } = useSession();
  const [name, setName] = useState("Main account");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    try {
      await client.post(
        "/onboarding",
        {
          baseCurrency: "USD",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          accountName: name,
          accountCurrency: "USD",
          openingBalance: balance,
        },
        `onboarding-${Date.now()}`,
      );
      setDone(true);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Unable to finish setup",
      );
    }
  };
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Set up your first account</Text>
      <TextInput
        placeholder="Account name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        keyboardType="decimal-pad"
        placeholder="Opening balance"
        value={balance}
        onChangeText={setBalance}
        style={styles.input}
      />
      {done ? (
        <Text>Setup complete. Loading dashboard…</Text>
      ) : (
        <Button title="Continue" onPress={submit} />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

export function DashboardScreen() {
  const { client, setTokens } = useSession();
  const [dashboard, setDashboard] = useState<any>();
  const [error, setError] = useState("");
  React.useEffect(() => {
    client
      .get<any>("/dashboard")
      .then(setDashboard)
      .catch((value) =>
        setError(
          value instanceof Error ? value.message : "Unable to load dashboard",
        ),
      );
  }, [client]);
  if (error)
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Sign out" onPress={() => setTokens(null)} />
      </SafeAreaView>
    );
  if (!dashboard)
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Overview</Text>
      <Text style={styles.total}>
        {dashboard.totals.amount} {dashboard.baseCurrency}
        {dashboard.totals.partial ? " *" : ""}
      </Text>
      {dashboard.totals.warnings.map((warning: string) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}
      <Text style={styles.subtitle}>Recent activity</Text>
      {dashboard.recentActivity.map((item: any) => (
        <View key={item.id} style={styles.row}>
          <Text>{item.kind}</Text>
          <Text>
            {item.amount} {item.currencyCode}
          </Text>
        </View>
      ))}
      <Button title="Sign out" onPress={() => setTokens(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 14, padding: 24 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 18, fontWeight: "600", marginTop: 14 },
  total: { fontSize: 36, fontWeight: "700" },
  input: { borderColor: "#bbb", borderRadius: 8, borderWidth: 1, padding: 12 },
  error: { color: "#b42318" },
  warning: { color: "#9a6700" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});
