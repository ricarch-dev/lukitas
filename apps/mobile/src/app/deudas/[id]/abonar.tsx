import { useLocalSearchParams } from 'expo-router';
import { RootNavigator } from '../../../navigation/RootNavigator';
import { DebtPaymentScreen } from '../../../modules/debts/screens/debt-payment-screen';

export default function DebtPaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RootNavigator>
      <DebtPaymentScreen id={id ?? ''} />
    </RootNavigator>
  );
}
