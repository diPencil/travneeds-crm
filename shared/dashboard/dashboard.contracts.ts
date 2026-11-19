import type { leadSources, leadPriorities } from '../crm/crm.contracts.js';
import type { IncomingMessagePreview } from '../inbox/inbox.contracts.js';

export const dashboardPeriods = ['monthly', 'weekly'] as const;
export type DashboardPeriod = (typeof dashboardPeriods)[number];

export interface DashboardOverview {
  metrics: {
    quotations: number;
    bookings: number;
    pendingBookings: number;
    customers: number;
    leads: number;
    convertedLeads: number;
    confirmedBookings: number;
  };
  trend: Record<DashboardPeriod, { date: string; quotations: number; bookings: number }[]>;
  bookedValue: { currency: string; amount: string }[] | null;
  leadSources: { source: (typeof leadSources)[number]; count: number }[];
  reminders: {
    id: string;
    title: string;
    time: string;
    priority: (typeof leadPriorities)[number];
  }[];
  recentIncomingMessages: IncomingMessagePreview[];
}
