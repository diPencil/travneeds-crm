export const inboxChannels = ['web', 'messenger', 'instagram', 'whatsapp'] as const;
export type InboxChannel = (typeof inboxChannels)[number];
export type MetaChannel = Exclude<InboxChannel, 'web'>;
export type MessageDelivery =
  'received' | 'sending' | 'sent' | 'failed' | 'unknown' | 'delivered' | 'read';
export interface InboxThread {
  id: string;
  channel: InboxChannel;
  contactName: string;
  status: 'open' | 'closed';
  lastMessageAt: string;
  lastInboundAt: string | null;
  unread: number;
  quotationId: string | null;
  customerId: string | null;
  leadId: string | null;
  directCustomerId: string | null;
}
export interface InboxMessage {
  id: string;
  direction: 'incoming' | 'outgoing';
  body: string;
  delivery: MessageDelivery;
  createdAt: string;
}

export interface IncomingMessagePreview {
  id: string;
  threadId: string;
  channel: InboxChannel;
  contactName: string;
  preview: string;
  unread: boolean;
  createdAt: string;
}
