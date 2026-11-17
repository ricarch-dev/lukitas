import { useLocalSearchParams } from 'expo-router';
import { RootNavigator } from '../../navigation/RootNavigator';
import { DebtDetailScreen } from '../../modules/debts/screens/debt-detail-screen';

export default function DebtDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RootNavigator>
      <DebtDetailScreen id={id ?? ''} />
    </RootNavigator>
  );
}
