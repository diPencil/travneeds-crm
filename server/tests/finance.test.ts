import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decimalToMinor, minorToDecimal, formatFinanceMoney } from '../../shared/finance/money.js';
import { reportDateRange } from '../../shared/finance/report-dates.js';
import { calculateInvoice } from '../../shared/finance/invoice-calculation.js';

test('invoice totals round each quantity line then discount and tax using exact arithmetic', () => {
  const totals = calculateInvoice(
    [
      { quantity: '1.125', unitPrice: '10.00' },
      { quantity: '3', unitPrice: '0.10' },
      { quantity: '0.5', unitPrice: '0.01' },
    ],
    '1.00',
    '14.00',
  );
  assert.deepEqual(totals, {
    lineAmounts: ['11.25', '0.30', '0.01'],
    subtotal: '11.56',
    discount: '1.00',
    taxableAmount: '10.56',
    taxAmount: '1.48',
    total: '12.04',
  });
  assert.throws(() => calculateInvoice([{ quantity: '1', unitPrice: '1.00' }], '1.01', '0'));
  for (const quantity of ['0', '-1', '1e3', '1.0001'])
    assert.throws(() => calculateInvoice([{ quantity, unitPrice: '1.00' }], '0', '0'));
  assert.throws(() => calculateInvoice([{ quantity: '1', unitPrice: '1.00' }], '0', '100.01'));
});

test('finance money preserves every cent beyond Number precision', () => {
  assert.equal(decimalToMinor('9999999999999999.99'), 999999999999999999n);
  assert.equal(minorToDecimal(decimalToMinor('0.10') + decimalToMinor('0.20')), '0.30');
  assert.equal(minorToDecimal(-1n), '-0.01');
  assert.equal(decimalToMinor('-0.01'), -1n);
  for (const value of ['1e3', 'NaN', '0.001', ' 1.00']) assert.throws(() => decimalToMinor(value));
});
test('finance formatting preserves large amounts and negative fractional values', () => {
  assert.equal(
    formatFinanceMoney('9999999999999999.99', 'USD', 'en-US'),
    '$9,999,999,999,999,999.99',
  );
  assert.equal(formatFinanceMoney('-0.01', 'USD', 'en-US'), '-$0.01');
  assert.equal(formatFinanceMoney(null, 'USD', 'en-US'), '—');
});

test('report periods use inclusive UTC calendar dates across week and year boundaries', () => {
  assert.deepEqual(reportDateRange('week', new Date('2026-01-01T00:30:00Z')), {
    from: '2025-12-29',
    to: '2026-01-01',
  });
  assert.deepEqual(reportDateRange('quarter', new Date('2026-11-19T23:59:00Z')), {
    from: '2026-10-01',
    to: '2026-11-19',
  });
  assert.deepEqual(reportDateRange('month', new Date('2026-03-01T00:00:00Z')), {
    from: '2026-03-01',
    to: '2026-03-01',
  });
});
