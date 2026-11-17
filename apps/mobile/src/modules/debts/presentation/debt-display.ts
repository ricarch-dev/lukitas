export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function debtDateLabel(value: string): string {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value),
  );
}

export const debtStatusLabel = {
  PENDING: 'Pendiente',
  OVERDUE: 'Vencido',
  SETTLED: 'Saldado',
} as const;
