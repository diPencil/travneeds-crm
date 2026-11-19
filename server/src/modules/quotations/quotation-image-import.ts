import { Resolver } from 'node:dns/promises';
import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { BlockList, isIP } from 'node:net';
import { HttpError } from '../../http/errors.js';
import { quotationImageSizeLimit } from './quotation-media.service.js';

const blocked = new BlockList();
for (const [base, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  blocked.addSubnet(base, prefix, 'ipv4');
const resolver = new Resolver({ timeout: 2500, tries: 2 });

export async function downloadQuotationImage(url: URL): Promise<Buffer> {
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    isIP(url.hostname) ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(url.hostname) ||
    /\.(localhost|local|internal|test|invalid|onion)$/i.test(url.hostname)
  ) {
    throw new HttpError(400, 'IMAGE_HOST_NOT_ALLOWED');
  }

  const addresses = await resolver.resolve4(url.hostname).catch(() => []);
  if (!addresses.length) throw new HttpError(502, 'IMAGE_IMPORT_FAILED');
  if (addresses.some((address) => !isIP(address) || blocked.check(address, 'ipv4')))
    throw new HttpError(400, 'IMAGE_HOST_NOT_ALLOWED');

  try {
    // Pin the HTTP connection to the checked address while verifying TLS against the original host.
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      get(
        {
          hostname: addresses[0],
          servername: url.hostname,
          path: url.pathname + url.search,
          headers: {
            Host: url.hostname,
            Accept: 'image/png,image/jpeg,image/webp',
            'Accept-Encoding': 'identity',
          },
          signal: AbortSignal.timeout(10000),
          agent: false,
        },
        resolve,
      ).once('error', reject);
    });

    try {
      if (
        response.statusCode !== 200 ||
        (response.headers['content-encoding'] &&
          response.headers['content-encoding'] !== 'identity')
      )
        throw new HttpError(502, 'IMAGE_IMPORT_FAILED');
      if (Number(response.headers['content-length']) > quotationImageSizeLimit)
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE');

      const chunks: Buffer[] = [];
      let size = 0;
      for await (const part of response as AsyncIterable<Buffer>) {
        size += part.length;
        if (size > quotationImageSizeLimit) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
        chunks.push(part);
      }
      return Buffer.concat(chunks, size);
    } finally {
      response.destroy();
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'IMAGE_IMPORT_FAILED');
  }
}
