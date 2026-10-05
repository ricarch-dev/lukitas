import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../../features/auth-screen-theme';
import { RootNavigator } from '../../navigation/RootNavigator';

function WebTab({ children, isFocused, style: _style, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={[styles.tab, isFocused && styles.selectedTab]}
    >
      <Text style={[styles.tabLabel, isFocused && styles.selectedLabel]}>{children}</Text>
    </Pressable>
  );
}

export default function WebTabsLayout() {
  return (
    <RootNavigator>
      <Tabs style={styles.shell}>
        <View style={styles.content}>
          <TabSlot />
        </View>
        <TabList style={styles.tabList} accessibilityLabel="Navegación principal">
          <TabTrigger name="index" href="/(tabs)" asChild>
            <WebTab accessibilityLabel="Inicio">Inicio</WebTab>
          </TabTrigger>
          <TabTrigger name="movimientos" href="/(tabs)/movimientos" asChild>
            <WebTab accessibilityLabel="Movimientos">Movimientos</WebTab>
          </TabTrigger>
          <TabTrigger name="planificacion" href="/(tabs)/planificacion" asChild>
            <WebTab accessibilityLabel="Planificación">Planificación</WebTab>
          </TabTrigger>
          <TabTrigger name="ajustes" href="/(tabs)/ajustes" asChild>
            <WebTab accessibilityLabel="Ajustes">Ajustes</WebTab>
          </TabTrigger>
        </TabList>
      </Tabs>
    </RootNavigator>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: APP_COLORS.canvas },
  content: { flex: 1, minHeight: 0 },
  tabList: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 520,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderColor: APP_COLORS.border,
    borderWidth: 1,
    borderRadius: 32,
    padding: 5,
  },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 26, paddingHorizontal: 3 },
  selectedTab: { backgroundColor: APP_COLORS.primary },
  tabLabel: { color: APP_COLORS.body, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  selectedLabel: { color: APP_COLORS.surface },
});
