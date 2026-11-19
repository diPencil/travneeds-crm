import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import {
  encryptIntegrationSecret,
  decryptIntegrationSecret,
} from '../src/modules/settings/integration-secrets.js';
import { convertCurrencyAmount } from '../../shared/currency/currency-money.js';

test('integration secrets are randomized, authenticated and bound to a provider field', () => {
  const key = randomBytes(32).toString('hex');
  const first = encryptIntegrationSecret('private-value', 'smtp:password', key);
  const second = encryptIntegrationSecret('private-value', 'smtp:password', key);
  assert.notEqual(first, second);
  assert.ok(!first.includes('private-value'));
  assert.equal(decryptIntegrationSecret(first, 'smtp:password', key), 'private-value');
  assert.throws(() => decryptIntegrationSecret(first, 'google:clientSecret', key));
  assert.throws(() =>
    decryptIntegrationSecret(first, 'smtp:password', randomBytes(32).toString('hex')),
  );
  assert.throws(() => encryptIntegrationSecret('value', 'smtp:password', ''));
});

test('currency conversion preserves large values and rounds once to the nearest cent', () => {
  assert.equal(convertCurrencyAmount('90071992547409.93', '1.00000000'), '90071992547409.93');
  assert.equal(convertCurrencyAmount('0.01', '0.50000000'), '0.01');
  assert.equal(convertCurrencyAmount('12.34', '50.25000000'), '620.09');
  for (const rate of ['0', '-1', 'NaN', '1.000000001'])
    assert.throws(() => convertCurrencyAmount('1.00', rate));
});
