export type AmountKey =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | 'clear' | 'backspace';

export function amountDigits(value: string): string {
  const normalized = value.trim().replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return '0';
  return `${match[1]}${(match[2] ?? '').padEnd(2, '0')}`.replace(/^0+(?=\d)/, '') || '0';
}

export function amountFromDigits(digits: string): string {
  const padded = digits.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

export function applyAmountKey(digits: string, key: AmountKey): string {
  if (key === 'clear') return '0';
  if (key === 'backspace') return digits.slice(0, -1) || '0';
  return `${digits}${key}`.replace(/^0+(?=\d)/, '') || '0';
}

export function formatAccountAmount(value: string, currency: 'VES' | 'USD'): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return value;
  const [whole, fraction = ''] = normalized.split('.');
  const group = currency === 'VES' ? '.' : ',';
  const decimal = currency === 'VES' ? ',' : '.';
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, group)}${decimal}${fraction.padEnd(2, '0')}`;
}
