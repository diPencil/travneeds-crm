import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(hex: string): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(hex)) throw new Error('Integration encryption key is unavailable');
  return Buffer.from(hex, 'hex');
}
export function encryptIntegrationSecret(value: string, context: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(keyHex), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}
export function decryptIntegrationSecret(value: string, context: string, keyHex: string): string {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || extra !== undefined || !iv || !tag || !encrypted)
    throw new Error('Invalid encrypted integration secret');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(keyHex),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
