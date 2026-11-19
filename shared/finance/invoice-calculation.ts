import { decimalToMinor, minorToDecimal } from './money.js';

export interface InvoiceLineInput {
  description: string;
  quantity: string;
  unitPrice: string;
}
export interface InvoiceTotals {
  lineAmounts: string[];
  subtotal: string;
  discount: string;
  taxableAmount: string;
  taxAmount: string;
  total: string;
}
const maximum = 999999999999999999n;
export function calculateInvoice(
  items: Pick<InvoiceLineInput, 'quantity' | 'unitPrice'>[],
  discount: string,
  taxRate: string,
): InvoiceTotals {
  if (!items.length || items.length > 100) throw new Error('Invalid invoice lines');
  const amounts = items.map(({ quantity, unitPrice }) => {
    if (!/^(0|[1-9]\d{0,5})(\.\d{1,3})?$/.test(quantity)) throw new Error('Invalid quantity');
    const [whole, fraction = ''] = quantity.split('.');
    const units = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
    if (units <= 0n || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(unitPrice))
      throw new Error('Invalid price or quantity');
    return (units * decimalToMinor(unitPrice) + 500n) / 1000n;
  });
  const subtotal = amounts.reduce((sum, value) => sum + value, 0n);
  const reduction = decimalToMinor(discount);
  const rate = decimalToMinor(taxRate);
  if (reduction < 0n || reduction > subtotal || rate < 0n || rate > 10000n)
    throw new Error('Invalid discount or tax');
  const taxable = subtotal - reduction;
  const tax = (taxable * rate + 5000n) / 10000n;
  if (subtotal > maximum || taxable + tax > maximum)
    throw new Error('Invoice amount exceeds limit');
  return {
    lineAmounts: amounts.map(minorToDecimal),
    subtotal: minorToDecimal(subtotal),
    discount: minorToDecimal(reduction),
    taxableAmount: minorToDecimal(taxable),
    taxAmount: minorToDecimal(tax),
    total: minorToDecimal(taxable + tax),
  };
}
