export const emailStatuses = ['sending', 'sent', 'failed', 'unknown'] as const;
export type EmailStatus = (typeof emailStatuses)[number];
export interface EmailDelivery {
  id: string;
  status: EmailStatus;
  quotationId: string;
  quotationReference: string;
  recipient: string;
  subject: string;
  createdAt: string;
  finishedAt: string | null;
}
export interface EmailDirectory {
  deliveries: EmailDelivery[];
  counts: Record<EmailStatus, number>;
  total: number;
  pageSize: number;
}
