import type { BookingStatus } from '../bookings/booking.contracts.js';
import type { EmailStatus } from '../emails/email.contracts.js';
import type { InboxChannel, MessageDelivery } from '../inbox/inbox.contracts.js';
import type { QuotationStatus } from '../quotations/quotation.contracts.js';
import type { CrmRecord } from './crm.contracts.js';

export const customerFileSections = [
  'timeline',
  'leads',
  'quotations',
  'bookings',
  'payments',
  'invoices',
  'inbox',
  'emails',
] as const;
export type CustomerFileSection = (typeof customerFileSections)[number];

export interface CustomerFileOverview {
  customer: CrmRecord;
  totals: { quotations: number; bookings: number; inbox: number; emails: number };
  finance: { currency: string; netReceived: string }[] | null;
}

interface HistoryRecord {
  id: string;
  createdAt: string;
}
interface Money {
  currency: string;
  amount: string;
}
export interface CustomerFileRecords {
  timeline: HistoryRecord & {
    category:
      'lead' | 'customer' | 'quotation' | 'booking' | 'email' | 'message' | 'payment' | 'invoice';
    event: string;
    reference: string | null;
    operator: string | null;
  };
  leads: HistoryRecord & {
    name: string;
    source: string;
    status: string;
    assignedName: string | null;
    convertedAt: string | null;
    archivedAt: string | null;
  };
  quotations: HistoryRecord & {
    reference: string;
    titleEn: string | null;
    titleAr: string | null;
    status: QuotationStatus | null;
    version: number;
    sharedLinks: number;
    lastSentAt: string | null;
  };
  bookings: HistoryRecord &
    Money & {
      reference: string;
      quotationId: string;
      quotationReference: string;
      quotationVersion: number;
      status: BookingStatus;
      startDate: string | null;
      endDate: string | null;
    };
  payments: HistoryRecord &
    Money & {
      bookingReference: string;
      purpose: 'customer_receipt' | 'customer_refund';
      status: 'pending' | 'verified' | 'void';
      method: string;
      reference: string | null;
      settledOn: string | null;
    };
  invoices: HistoryRecord &
    Money & {
      number: string | null;
      bookingReference: string | null;
      status: 'draft' | 'issued' | 'void';
      dueOn: string | null;
    };
  inbox: HistoryRecord & {
    threadId: string;
    channel: InboxChannel;
    direction: 'incoming' | 'outgoing';
    body: string;
    delivery: MessageDelivery;
  };
  emails: HistoryRecord & {
    quotationReference: string;
    quotationVersion: number;
    recipient: string;
    subject: string;
    status: EmailStatus;
    finishedAt: string | null;
  };
}
export type CustomerFilePage = {
  [Section in CustomerFileSection]: {
    section: Section;
    page: number;
    hasMore: boolean;
    rows: CustomerFileRecords[Section][];
  };
}[CustomerFileSection];
