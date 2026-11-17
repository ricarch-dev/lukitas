import { RootNavigator } from '../../navigation/RootNavigator';
import { DebtsScreen } from '../../modules/debts/screens/debts-screen';

export default function DebtsRoute() {
  return (
    <RootNavigator>
      <DebtsScreen />
    </RootNavigator>
  );
}
