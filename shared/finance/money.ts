export function decimalToMinor(value: string): bigint {
  if (!/^-?(0|[1-9]\d*)(\.\d{1,2})?$/.test(value)) throw new Error('Invalid decimal money');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -minor : minor;
}
export function minorToDecimal(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function formatFinanceMoney(value: string | null, currency: string, locale: string): string {
  if (value === null) return '—';
  const minor = decimalToMinor(value);
  const absolute = minor < 0n ? -minor : minor;
  const whole = absolute / 100n;
  const formattedWhole = minor < 0n ? (whole === 0n ? -0 : -whole) : whole;
  const fraction = new Intl.NumberFormat(locale, {
    useGrouping: false,
    minimumIntegerDigits: 2,
  }).format(Number(absolute % 100n));
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .formatToParts(formattedWhole)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}
