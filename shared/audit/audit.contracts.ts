export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export const auditModules = [
  'authentication',
  'users',
  'leads',
  'customers',
  'suppliers',
  'settings',
  'account',
  'system',
  'finance',
  'quotations',
  'bookings',
  'inbox',
  'emails',
] as const;
export const auditSeverities = ['info', 'warning', 'critical'] as const;
export interface SystemAuditEvent extends AuditEvent {
  actorId: string | null;
  actorName: string | null;
  actorAvatarGender: 'male' | 'female';
  module: (typeof auditModules)[number];
  details: string | null;
  requestIp: string | null;
  severity: (typeof auditSeverities)[number];
  outcome: 'success' | 'failure';
}
export interface SystemAuditList {
  events: SystemAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}
