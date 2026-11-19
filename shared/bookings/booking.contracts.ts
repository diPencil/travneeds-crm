import type { LocalizedContent } from '../quotations/quotation.contracts.js';

export const bookingStatuses = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
export type BookingStatus = (typeof bookingStatuses)[number];
export const bookingTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export interface Booking {
  id: string;
  reference: string;
  quotationId: string;
  quotationReference: string;
  quotationVersion: number;
  customerId: string;
  customerName: string;
  title: LocalizedContent;
  startDate: string;
  endDate: string;
  currency: string;
  total: string;
  status: BookingStatus;
  version: number;
  financeId: string;
  createdAt: string;
}
export interface BookingDirectory {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<BookingStatus, number>;
  totals: { currency: string; amount: string }[];
}
