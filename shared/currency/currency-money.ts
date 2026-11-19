import { decimalToMinor, minorToDecimal } from '../finance/money.js';

export function convertCurrencyAmount(amount: string, rate: string): string {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,8})?$/.test(rate)) throw new Error('Invalid exchange rate');
  const [whole, fraction = ''] = rate.split('.');
  const multiplier = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'));
  const minor = decimalToMinor(amount);
  if (multiplier <= 0n || minor < 0n) throw new Error('Invalid conversion amount or rate');
  const converted = (minor * multiplier + 50000000n) / 100000000n;
  if (converted > 999999999999999999n) throw new Error('Conversion amount exceeds limit');
  return minorToDecimal(converted);
}
