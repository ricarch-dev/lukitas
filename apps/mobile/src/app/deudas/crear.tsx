import { RootNavigator } from '../../navigation/RootNavigator';
import { CreateDebtScreen } from '../../modules/debts/screens/create-debt-screen';

export default function CreateDebtRoute() {
  return (
    <RootNavigator>
      <CreateDebtScreen />
    </RootNavigator>
  );
}
