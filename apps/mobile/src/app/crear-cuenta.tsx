import { CreateAccountScreen } from '../features/create-account-screen';
import { RootNavigator } from '../navigation/RootNavigator';

export default function CreateAccountRoute() {
  return <RootNavigator><CreateAccountScreen /></RootNavigator>;
}
