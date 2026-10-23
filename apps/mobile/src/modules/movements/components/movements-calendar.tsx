import type { TransactionDto } from '@lukitas/contracts';
import { Text, View } from 'react-native';
import { movementAmount, movementDay, monthlyFlow } from '../presentation/movements';
import { styles } from '../screens/movements-styles';

export function MovementsCalendar({
  month,
  items,
  timezone,
}: {
  readonly month: string;
  readonly items: readonly TransactionDto[];
  readonly timezone: string;
}) {
  const start = new Date(`${month}-01T12:00:00`);
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return (
    <View style={styles.calendar}>
      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((weekday) => (
        <Text key={weekday} style={styles.weekday}>
          {weekday}
        </Text>
      ))}
      {Array.from({ length: (start.getDay() + 6) % 7 }, (_, index) => (
        <View key={`blank-${index}`} style={styles.day} />
      ))}
      {Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const movements = items.filter(
          (item) =>
            movementDay(item.occurredAt, timezone) === `${month}-${String(day).padStart(2, '0')}`,
        );
        const flow = monthlyFlow(movements);
        const amounts = [
          ...Object.entries(flow.income).map(
            ([code, amount]) => `+${movementAmount(amount, code)}`,
          ),
          ...Object.entries(flow.expense).map(
            ([code, amount]) => `−${movementAmount(amount, code)}`,
          ),
        ];
        return (
          <View key={day} style={styles.day}>
            <Text style={styles.dayNumber}>{day}</Text>
            <Text numberOfLines={2} style={styles.dayFlow}>
              {amounts.join('\n') || (movements.length ? `${movements.length} mov.` : '—')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
