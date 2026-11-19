export type CrmKind = 'leads' | 'customers' | 'suppliers';
export const leadStatuses = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;
export const leadSources = [
  'Website',
  'Social Media',
  'Referral',
  'Email',
  'Walk-in',
  'Cold Call',
] as const;
export const leadPriorities = ['High', 'Medium', 'Low'] as const;
export const customerStatuses = ['Active', 'VIP', 'Recurring', 'Suspended'] as const;
export const customerTypes = ['Individual', 'Corporate'] as const;
export const supplierStatuses = ['Active', 'Inactive'] as const;

export interface CrmRecord {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  type?: string;
  source?: string;
  priority?: string;
  valueAmount?: string | null;
  currency?: string | null;
  assignedUserId?: string | null;
  assignedName?: string | null;
  nextFollowUpAt?: string | null;
  bookingCount?: number;
  convertedCustomerId?: string | null;
  nationality?: string | null;
  category?: string;
  contactName?: string | null;
  country?: string | null;
  city?: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface CrmDirectory {
  records: CrmRecord[];
  total: number;
  page: number;
  pageSize: number;
  metrics: Record<string, number | null>;
}
export interface CrmOptions {
  agents: { id: string; fullName: string }[];
  categories: string[];
  baseCurrency: string;
}
