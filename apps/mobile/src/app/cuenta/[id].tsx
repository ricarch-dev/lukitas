import { useLocalSearchParams } from 'expo-router';
import { RootNavigator } from '../../navigation/RootNavigator';
import { AccountDetailScreen } from '../../modules/accounts/screens/account-detail-screen';

export default function AccountDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RootNavigator>
      <AccountDetailScreen id={id} />
    </RootNavigator>
  );
}
