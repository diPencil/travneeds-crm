import { lookup } from 'node:dns/promises';
import { BlockList } from 'node:net';
import nodemailer from 'nodemailer';
import { HttpError } from '../../http/errors.js';
import { readIntegrationCredentials } from '../settings/integrations.service.js';

const blocked = new BlockList();
for (const [base, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(base, prefix, 'ipv4');

export async function smtpTransport() {
  const config = await readIntegrationCredentials('smtp');
  const port = Number(config.port);
  if (![465, 587, 2525].includes(port)) throw new HttpError(400, 'SMTP_INVALID_PORT');
  const timeout = Math.min(30, Math.max(5, Number(config.timeout ?? 15))) * 1000;
  let ip: string;
  try {
    const addresses = await lookup(config.host, { family: 4, all: true });
    if (!addresses.length || addresses.some(({ address }) => blocked.check(address, 'ipv4')))
      throw new Error('SMTP host is not public');
    ip = addresses[0].address;
  } catch {
    throw new HttpError(503, 'SMTP_HOST_UNAVAILABLE');
  }
  const secure = config.encryption === 'tls';
  const transport = nodemailer.createTransport({
    host: ip,
    port,
    secure,
    requireTLS: !secure,
    name: 'travneeds-crm',
    tls: { servername: config.host, minVersion: 'TLSv1.2', rejectUnauthorized: true },
    auth: { user: config.username, pass: config.password },
    connectionTimeout: timeout,
    greetingTimeout: timeout,
    socketTimeout: timeout,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    transport,
    from: { name: config.fromName, address: config.fromEmail },
    replyTo: config.replyTo || undefined,
  };
}
