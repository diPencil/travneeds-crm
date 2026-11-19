import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { MetaChannel } from '../../../../shared/inbox/inbox.contracts.js';
import { HttpError } from '../../http/errors.js';
import { readIntegrationCredentials } from '../settings/integrations.service.js';

export const metaChannels = z.enum(['messenger', 'instagram', 'whatsapp']);
export function verifyMetaSignature(body: Buffer, signature: string, secret: string) {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(
    createHmac('sha256', secret).update(body).digest(),
    Buffer.from(signature.slice(7), 'hex'),
  );
}
export interface MetaIncoming {
  contact: string;
  name: string;
  key: string;
  body: string;
  sentAt: Date;
}
export interface MetaStatus {
  contact: string;
  key: string;
  status: 'delivered' | 'read' | 'failed';
}
const identifier = z.string().regex(/^\d{1,80}$/);
const messageKey = z.string().regex(/^[!-~]{1,190}$/);
const messageText = z.string().trim().min(1).max(4000);
const messengerEnvelope = z.object({
  object: z.enum(['page', 'instagram']),
  entry: z.array(z.object({ id: identifier, messaging: z.array(z.unknown()).optional() })).max(300),
});
const messengerItem = z.object({
  sender: z.object({ id: identifier }),
  recipient: z.object({ id: identifier }),
  timestamp: z.number().int().positive(),
  message: z.object({ mid: messageKey, text: messageText, is_echo: z.boolean().optional() }),
});
const whatsappEnvelope = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({ id: identifier, changes: z.array(z.unknown()) })).max(300),
});
const whatsappChange = z.object({
  field: z.literal('messages'),
  value: z.object({
    metadata: z.object({ phone_number_id: identifier }),
    messages: z.array(z.unknown()).optional(),
    statuses: z.array(z.unknown()).optional(),
    contacts: z
      .array(z.object({ wa_id: identifier, profile: z.object({ name: z.string().max(180) }) }))
      .optional(),
  }),
});
const whatsappItem = z.object({
  from: identifier,
  id: messageKey,
  timestamp: z.string().regex(/^\d{1,10}$/),
  type: z.literal('text'),
  text: z.object({ body: messageText }),
});
const whatsappStatus = z.object({
  recipient_id: identifier,
  id: messageKey,
  status: z.enum(['delivered', 'read', 'failed']),
});

export function normalizeMetaWebhook(
  channel: MetaChannel,
  payload: unknown,
  accountId: string,
  businessAccountId?: string,
) {
  const messages: MetaIncoming[] = [];
  const statuses: MetaStatus[] = [];
  if (channel !== 'whatsapp') {
    const envelope = messengerEnvelope.parse(payload);
    if (envelope.object !== (channel === 'messenger' ? 'page' : 'instagram'))
      return { messages, statuses };
    for (const entry of envelope.entry) {
      if (entry.id !== accountId) continue;
      for (const value of entry.messaging ?? []) {
        const item = messengerItem.safeParse(value);
        if (!item.success || item.data.message.is_echo || item.data.recipient.id !== accountId)
          continue;
        const { sender, message, timestamp } = item.data;
        messages.push({
          contact: sender.id,
          name: sender.id,
          key: message.mid,
          body: message.text,
          sentAt: new Date(timestamp),
        });
      }
    }
    return { messages, statuses };
  }
  for (const entry of whatsappEnvelope.parse(payload).entry) {
    if (entry.id !== businessAccountId) continue;
    for (const value of entry.changes) {
      const change = whatsappChange.safeParse(value);
      if (!change.success || change.data.value.metadata.phone_number_id !== accountId) continue;
      for (const message of change.data.value.messages ?? []) {
        const item = whatsappItem.safeParse(message);
        if (!item.success) continue;
        const { from, timestamp, text, id } = item.data;
        const name =
          change.data.value.contacts?.find((contact) => contact.wa_id === from)?.profile.name ||
          from;
        messages.push({
          contact: from,
          name,
          key: id,
          body: text.body,
          sentAt: new Date(Number(timestamp) * 1000),
        });
      }
      for (const status of change.data.value.statuses ?? []) {
        const item = whatsappStatus.safeParse(status);
        if (item.success)
          statuses.push({
            contact: item.data.recipient_id,
            key: item.data.id,
            status: item.data.status,
          });
      }
    }
  }
  return { messages, statuses };
}

export async function prepareMetaReply(
  channel: MetaChannel,
  account: string,
  recipient: string,
  body: string,
) {
  const config = await readIntegrationCredentials(channel);
  if (!config || config.accountId !== account) throw new HttpError(503, 'CHANNEL_NOT_CONFIGURED');
  const version = z
    .string()
    .regex(/^v\d{1,3}\.\d{1,2}$/)
    .parse(config.apiVersion);
  const host = channel === 'instagram' ? 'graph.instagram.com' : 'graph.facebook.com';
  const endpoint = `https://${host}/${version}/${identifier.parse(account)}/messages`;
  const message =
    channel === 'whatsapp'
      ? { messaging_product: 'whatsapp', to: recipient, type: 'text', text: { body } }
      : {
          recipient: { id: recipient },
          ...(channel === 'messenger' ? { messaging_type: 'RESPONSE' } : {}),
          message: { text: body },
        };
  const key = z.object({ message_id: messageKey });
  const whatsapp = z.object({ messages: z.array(z.object({ id: messageKey })).min(1) });
  return async (): Promise<
    { delivery: 'sent'; key: string } | { delivery: 'failed' | 'unknown' }
  > => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(12000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) return { delivery: response.status < 500 ? 'failed' : 'unknown' };
      const result: unknown = await response.json();
      return {
        delivery: 'sent',
        key:
          channel === 'whatsapp'
            ? whatsapp.parse(result).messages[0].id
            : key.parse(result).message_id,
      };
    } catch {
      return { delivery: 'unknown' };
    }
  };
}
