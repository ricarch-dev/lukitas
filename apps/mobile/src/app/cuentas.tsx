import { RootNavigator } from '../navigation/RootNavigator';
import { AccountsScreen } from '../modules/accounts/screens/accounts-screen';

export default function AccountsRoute() {
  return (
    <RootNavigator>
      <AccountsScreen />
    </RootNavigator>
  );
}
