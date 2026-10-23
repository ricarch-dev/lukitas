import { CreateAccountScreen } from '../modules/accounts/screens/create-account-screen';
import { RootNavigator } from '../navigation/RootNavigator';

export default function CreateAccountRoute() {
  return (
    <RootNavigator>
      <CreateAccountScreen />
    </RootNavigator>
  );
}
