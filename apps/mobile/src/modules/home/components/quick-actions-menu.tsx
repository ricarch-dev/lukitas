import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeftRight, Plus, WalletCards } from 'lucide-react-native';
import { AccessibilityInfo, Animated, BackHandler, Pressable, Text, View } from 'react-native';
import { APP_COLORS as colors } from '../../../shared/theme/app-colors';
import { styles } from '../styles/home-dashboard-styles';

export function QuickActionsMenu({ gutter }: { gutter: number }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) setMounted(true);
    if (reduceMotion) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) setMounted(false);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 190,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, reduceMotion, progress]);

  const close = useCallback(() => setVisible(false), []);
  useFocusEffect(useCallback(() => close, [close]));

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  function open(destination: 'account' | 'movement' | 'transfer') {
    close();
    if (destination === 'account') {
      router.push('/crear-cuenta');
      return;
    }
    router.push({
      pathname: '/(tabs)/movimientos',
      params: { create: destination === 'transfer' ? 'TRANSFER' : 'EXPENSE' },
    });
  }

  return (
    <>
      {visible ? (
        <Pressable
          style={styles.quickActionsBackdrop}
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú de acciones"
          onPress={close}
        />
      ) : null}
      {mounted ? (
        <Animated.View
          accessibilityElementsHidden={!visible}
          importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
          style={[
            styles.quickActionsAnchor,
            { right: gutter, bottom: process.env.EXPO_OS === 'web' ? 100 : 88 },
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.quickActionsPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
              onPress={() => open('account')}
              style={styles.quickActionsItem}
            >
              <WalletCards size={21} color={colors.body} />
              <Text style={styles.quickActionsLabel}>Crear cuenta</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nuevo movimiento"
              onPress={() => open('movement')}
              style={styles.quickActionsItem}
            >
              <Plus size={21} color={colors.body} />
              <Text style={styles.quickActionsLabel}>Nuevo movimiento</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nueva transferencia"
              onPress={() => open('transfer')}
              style={styles.quickActionsItem}
            >
              <ArrowLeftRight size={21} color={colors.body} />
              <Text style={styles.quickActionsLabel}>Nueva transferencia</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Cerrar acciones' : 'Abrir acciones'}
        accessibilityState={{ expanded: visible }}
        onPress={() => setVisible((current) => !current)}
        style={{ ...styles.floatingAdd, position: 'absolute', right: gutter }}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          <Plus size={20} color={colors.surface} strokeWidth={2} />
        </Animated.View>
      </Pressable>
    </>
  );
}
