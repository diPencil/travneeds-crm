import type { InvoiceLineInput } from './invoice-calculation.js';

export const paymentStatuses = [
  'unpaid',
  'deposit_paid',
  'partially_paid',
  'fully_paid',
  'overdue',
] as const;
export type FinancePaymentStatus = (typeof paymentStatuses)[number];
export interface FinanceSource {
  status: 'pending_trips' | 'ready';
  postingAvailable: false;
  manualInvoicesAvailable: true;
}
export interface FinanceBooking {
  id: string;
  reference: string;
  customer: string;
  agentId: string | null;
  agent: string | null;
  category: string | null;
  currency: string;
  totalAmount: string;
  paidAmount: string;
  outstandingBalance: string;
  supplierPaid: string;
  supplierCost: string | null;
  totalCost: string | null;
  profit: string | null;
  profitMargin: string | null;
  dueOn: string | null;
  bookedAt: string;
  paymentStatus: FinancePaymentStatus;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  invoiceDate: string | null;
}
export interface FinanceSummary {
  cashReceived: string;
  receivables: string;
  supplierPayables: string | null;
  totalAmount: string;
  totalCost: string | null;
  netProfit: string | null;
  profitMargin: string | null;
  overdue: number;
  bookings: number;
}
export interface FinanceOverview {
  source: FinanceSource;
  currency: string;
  summary: FinanceSummary | null;
  bookings: FinanceBooking[];
  total: number;
  page: number;
  pageSize: number;
}
export interface FinanceOptions {
  invoiceCurrencies: string[];
  source: FinanceSource;
  baseCurrency: string;
  agents: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  currencies: string[];
}
export interface FinanceInvoice {
  id: string;
  bookingId: string | null;
  bookingReference: string | null;
  number: string | null;
  party: 'customer' | 'supplier';
  billTo: string;
  kind: string;
  status: 'draft' | 'issued' | 'void';
  currency: string;
  amount: string;
  issuedOn: string | null;
  dueOn: string | null;
  terms: string | null;
  notes: string | null;
}
export interface FinanceInvoiceList {
  source: FinanceSource;
  currency: string;
  invoices: FinanceInvoice[];
  total: number;
  page: number;
  pageSize: number;
}
export interface FinancePayment {
  id: string;
  purpose: string;
  status: 'pending' | 'verified' | 'void';
  amount: string;
  currency: string;
  method: string;
  reference: string | null;
  settledOn: string | null;
  processedBy: string | null;
  notes: string | null;
}
export interface FinanceBookingDetail {
  source: FinanceSource;
  booking: FinanceBooking;
  payments: FinancePayment[];
  invoices: FinanceInvoice[];
  invoiceDefaults?: { items: InvoiceLineInput[]; email: string | null; phone: string | null };
}
export interface FinanceReports {
  source: FinanceSource;
  currency: string;
  summary: FinanceSummary | null;
  monthly: { month: string; revenue: string; cost: string | null; profit: string | null }[];
  categories: {
    name: string | null;
    bookings: number;
    revenue: string;
    cost: string | null;
    profit: string | null;
  }[];
  agents: {
    id: string | null;
    name: string | null;
    bookings: number;
    revenue: string;
    cost: string | null;
    profit: string | null;
    margin: string | null;
  }[];
}
