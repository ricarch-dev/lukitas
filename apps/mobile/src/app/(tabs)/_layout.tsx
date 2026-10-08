import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { APP_COLORS } from '../../shared/theme/app-colors';
import { RootNavigator } from '../../navigation/RootNavigator';

export default function TabsLayout() {
  return (
    <RootNavigator>
      <NativeTabs tintColor={APP_COLORS.primary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house" md="home" />
          <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="movimientos">
          <NativeTabs.Trigger.Icon sf="list.bullet" md="receipt_long" />
          <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="planificacion">
          <NativeTabs.Trigger.Icon sf="calendar" md="event" />
          <NativeTabs.Trigger.Label>Planificación</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="ajustes">
          <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
          <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </RootNavigator>
  );
}
