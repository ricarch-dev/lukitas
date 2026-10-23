import { ReportsScreen } from '../modules/reports/screens/reports-screen';
import { RootNavigator } from '../navigation/RootNavigator';

export default function ReportRoute() {
  return (
    <RootNavigator>
      <ReportsScreen />
    </RootNavigator>
  );
}
