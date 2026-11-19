import type { FinanceInvoice } from './finance.contracts.js';
import type { InvoiceLineInput } from './invoice-calculation.js';

export interface InvoiceInput {
  bookingId: string;
  customerId?: string;
  billTo: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issuerAddress: string;
  issuerContact: string;
  currency: string;
  documentDate: string;
  dueOn: string;
  reference: string;
  discount: string;
  taxRate: string;
  taxLabel: string;
  terms: string;
  notes: string;
  items: InvoiceLineInput[];
}
export interface InvoiceDocument extends FinanceInvoice {
  customerId?: string | null;
  documentDate: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  issuerName: string | null;
  issuerLogo: string | null;
  issuerAddress: string | null;
  issuerContact: string | null;
  reference: string | null;
  discount: string;
  taxRate: string;
  taxLabel: string | null;
  subtotal: string | null;
  taxAmount: string | null;
  version: number;
  items: (InvoiceLineInput & { amount: string })[];
}
