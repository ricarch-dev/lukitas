import { router } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { styles } from '../screens/movements-styles';

export function MovementsHeader({
  exportReady,
  exporting,
  onDownload,
}: {
  readonly exportReady: boolean;
  readonly exporting: boolean;
  readonly onDownload: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver al inicio"
        onPress={() => router.navigate('/')}
        style={styles.roundSmall}
      >
        <ArrowLeft size={23} color={colors.ink} />
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        Movimientos
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Descargar movimientos del mes"
        accessibilityState={{ disabled: !exportReady }}
        disabled={!exportReady}
        onPress={onDownload}
        style={styles.roundSmall}
      >
        {exporting ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <Download size={23} color={colors.ink} />
        )}
      </Pressable>
    </View>
  );
}
